'use server'

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '../../lib/supabase/server';
import { createAdminClient } from '../../lib/supabase/admin';
import { zernio } from '../zernio';

const LUMA_API_BASE = 'https://agents.lumalabs.ai/v1';

type BriefDataInput = {
  campaignName?: string;
  product?: string;
  goal?: string;
  brief?: string;
};

type VisualDataInput = {
  scene?: string;
  outfit?: string;
  lighting?: string;
  props?: string[];
};

type ModelRowForPost = {
  portrait_image_url: string | null;
  full_body_image_url: string | null;
  name: string;
  prompt: string | null;
  gender: string | null;
  vibe_aesthetic: string | null;
  hair_style_color: string | null;
  skin_tone: string | null;
  body_type: string | null;
  age_range: string | null;
};

/** Leading block so scene/style text does not override the selected model identity (Luma has no Gemini-style wrapper). */
function buildPostImageIdentityPreamble(m: ModelRowForPost): string {
  const lines: string[] = [
    'PRIMARY SUBJECT — IDENTITY LOCK: Depict exactly the same person as in the first reference image.',
    'If a second reference image is provided, it is a full-body view of the same individual — use both for identity consistency.',
    'Preserve facial structure, skin tone, hair, age, gender presentation, and distinctive features. Do not substitute a different person or a generic stock model.',
  ];

  if (m.name?.trim()) {
    lines.push(`Character label: ${m.name.trim()}.`);
  }

  const attrs = [
    m.gender?.trim() && `Gender presentation: ${m.gender.trim()}`,
    m.age_range?.trim() && `Age range: ${m.age_range.trim()}`,
    m.skin_tone?.trim() && `Skin tone: ${m.skin_tone.trim()}`,
    m.body_type?.trim() && `Body type: ${m.body_type.trim()}`,
    m.hair_style_color?.trim() && `Hair: ${m.hair_style_color.trim()}`,
    m.vibe_aesthetic?.trim() && `Aesthetic: ${m.vibe_aesthetic.trim()}`,
  ].filter(Boolean) as string[];

  if (attrs.length) {
    lines.push(attrs.join('. ') + '.');
  }

  if (m.prompt?.trim()) {
    lines.push(`Character description: ${m.prompt.trim()}`);
  }

  lines.push(
    'All details below describe setting, wardrobe mood, lighting, and campaign context only — apply them to this person, not a new subject.'
  );

  return lines.join(' ');
}

function summarizeUrlsForDevLog(urls: string[]): string {
  return urls
    .map((u) => {
      try {
        const url = new URL(u);
        const segments = url.pathname.split('/').filter(Boolean);
        const last = segments.pop() || '';
        return `${url.hostname}/…/${last}`;
      } catch {
        return '(unparseable-url)';
      }
    })
    .join(' | ');
}

/** Compose image prompt from Content Brief + Visual Direction (create-post form). */
function buildPostImagePromptFromForm(
  briefData?: BriefDataInput | null,
  visualData?: VisualDataInput | null
): string {
  const scene = visualData?.scene?.trim() || 'Studio';
  const outfit = visualData?.outfit?.trim() || 'Casual';
  const lighting = visualData?.lighting?.trim() || 'Soft Studio';
  const props = Array.isArray(visualData?.props)
    ? visualData.props.filter((p): p is string => typeof p === 'string' && p.length > 0)
    : [];

  const sentences: string[] = [
    'Photorealistic influencer content for social media.',
    `Setting: ${scene.toLowerCase()} environment. Wardrobe mood: ${outfit.toLowerCase()}. Lighting: ${lighting}.`,
  ];

  if (props.length) {
    sentences.push(`Naturally incorporate these props in the frame: ${props.join(', ')}.`);
  }

  const b = briefData || {};
  if (b.product?.trim()) {
    sentences.push(`Feature or showcase the product/brand: ${b.product.trim()}.`);
  }
  if (b.campaignName?.trim()) {
    sentences.push(`Campaign theme: ${b.campaignName.trim()}.`);
  }
  if (b.goal?.trim()) {
    sentences.push(`The shot should suit a "${b.goal.trim()}" marketing goal (engaging, on-brand).`);
  }
  if (b.brief?.trim()) {
    const briefText = b.brief.trim();
    const hasClosingPunctuation = /[.!?…]$/.test(briefText);
    sentences.push(`Creative brief: ${briefText}${hasClosingPunctuation ? '' : '.'}`);
  }

  sentences.push(
    'Pose naturally and expressively; professional commercial photography; wardrobe mood describes clothing styling for the locked subject above — not a different person.'
  );

  return sentences.join(' ');
}

function formatVisualContextForCaption(v?: VisualDataInput | null): string {
  if (!v || typeof v !== 'object') return '';
  const props = Array.isArray(v.props) ? v.props.filter(Boolean).join(', ') : '';
  const bits = [
    v.scene && `Scene: ${v.scene}`,
    v.outfit && `Outfit mood: ${v.outfit}`,
    v.lighting && `Lighting: ${v.lighting}`,
    props && `Props: ${props}`,
  ].filter(Boolean);
  return bits.length ? bits.join('. ') + '.' : '';
}

/** Stronger language rules so non-Latin outputs (e.g. Arabic) match the selected locale. */
function captionLanguageInstructions(language: string): string {
  const lang = (language || '').trim();
  if (lang.toLowerCase() === 'arabic') {
    return `- Write the ENTIRE caption in Arabic script (Modern Standard Arabic / فصحى), with natural social-media phrasing.
- Do not write the main body in English; keep hashtags in Latin if that matches common platform practice, but all sentence-level copy must be Arabic (except unavoidable brand names or product names the user gave in Latin).`;
  }
  return `- Write the ENTIRE caption in ${lang || 'the selected language'}, with natural social-media phrasing.`;
}

async function lumaFetch(endpoint: string, options: RequestInit = {}) {
  const apiKey = (process.env.LUMA_AGENTS_API_KEY || process.env.NEXT_PUBLIC_LUMA_AGENTS_API_KEY)?.trim();
  if (!apiKey) throw new Error('LUMA_AGENTS_API_KEY is not set.');

  const response = await fetch(`${LUMA_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Luma API error: ${response.statusText} ${errorData.message || ''}`);
  }

  return response.json();
}

async function uploadToSupabase(buffer: Buffer, fileName: string, contentType: string = 'image/png') {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from('posts')
      .upload(fileName, buffer, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error('Supabase storage upload failed:', error);
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('posts')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (err: any) {
    console.error('Error in uploadToSupabase:', err);
    throw err;
  }
}

function extensionForMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes('webm')) return 'webm';
  if (m.includes('quicktime')) return 'mov';
  if (m.startsWith('video/')) return 'mp4';
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('webp')) return 'webp';
  if (m.includes('gif')) return 'gif';
  if (m.includes('png')) return 'png';
  return 'bin';
}

function mediaKindFromMime(mime: string): 'image' | 'video' {
  return mime.toLowerCase().startsWith('video/') ? 'video' : 'image';
}

/** Best-effort type for Zernio when missing explicit metadata (URL may omit extension). */
function inferMediaKindFromUrl(url: string): 'image' | 'video' {
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (/\.(mp4|webm|mov|m4v|mkv)(\?|$)/i.test(path)) return 'video';
  } catch {
    const lower = url.toLowerCase();
    if (/\.(mp4|webm|mov|m4v|mkv)(\?|$)/i.test(lower)) return 'video';
  }
  return 'image';
}

/** Instagram feed allows width/height roughly 0.75–1.91; below that, use Story (see Zernio docs). */
const INSTAGRAM_FEED_MIN_ASPECT = 0.75;

function probeImageDimensionsFromBuffer(buffer: Buffer): { w: number; h: number } | null {
  if (
    buffer.length >= 24 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    const w = buffer.readUInt32BE(16);
    const h = buffer.readUInt32BE(20);
    if (w > 0 && h > 0) return { w, h };
    return null;
  }
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const h = buffer.readUInt16BE(offset + 5);
      const w = buffer.readUInt16BE(offset + 7);
      if (w > 0 && h > 0) return { w, h };
      return null;
    }
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const segLen = buffer.readUInt16BE(offset + 2);
    offset += 2 + segLen;
  }
  return null;
}

async function fetchImageAspectRatioFromUrl(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, {
      headers: { Range: 'bytes=0-262143' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const dim = probeImageDimensionsFromBuffer(Buffer.from(await res.arrayBuffer()));
    if (!dim) return null;
    return dim.w / dim.h;
  } catch {
    return null;
  }
}

/**
 * Instagram feed vs Story/Reels — Zernio requires platformSpecificData.contentType
 * for tall "story-shaped" media that is not valid as a feed post.
 */
async function buildInstagramPlatformSpecificData(
  mediaUrl: string,
  mediaKind: 'image' | 'video',
  postFormat?: string | null
): Promise<Record<string, unknown> | undefined> {
  if (postFormat === 'story') {
    if (mediaKind === 'video') {
      return { contentType: 'reels', shareToFeed: true };
    }
    return { contentType: 'story' };
  }
  if (mediaKind === 'image') {
    const ratio = await fetchImageAspectRatioFromUrl(mediaUrl);
    if (ratio !== null && ratio < INSTAGRAM_FEED_MIN_ASPECT) {
      return { contentType: 'story' };
    }
  }
  return undefined;
}

export async function uploadUserPostMediaAction(dataUrl: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const match = String(dataUrl).match(/^data:([^;,]+);base64,(.+)$/);
    if (!match) {
      return { success: false, error: 'Invalid image or video data' };
    }

    const mime = match[1].trim();
    const base64 = match[2];
    const buffer = Buffer.from(base64, 'base64');

    const maxBytes = 1024 * 1024;
    if (buffer.length > maxBytes) {
      return { success: false, error: 'File is too large (max 1 MB)' };
    }

    const isVideo = mediaKindFromMime(mime) === 'video';
    if (!mime.startsWith('image/') && !mime.startsWith('video/')) {
      return { success: false, error: 'Only image or video files are supported' };
    }

    const ext = extensionForMime(mime);
    const fileName = `user-upload/${user.id}-${Date.now()}.${ext}`;

    const publicUrl = await uploadToSupabase(buffer, fileName, mime);

    return {
      success: true,
      url: publicUrl,
      mediaType: (isVideo ? 'video' : 'image') as 'image' | 'video',
    };
  } catch (error: any) {
    console.error('uploadUserPostMediaAction', error);
    return { success: false, error: error.message || 'Upload failed' };
  }
}

async function generateLumaPost(
  prompt: string,
  aspectRatio: string = '1:1',
  characterImageUrls: string[] = [],
  referenceImages: string[] = []
) {
  const allImages = [...characterImageUrls, ...referenceImages];

  const body: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
  };

  // If we have images, pass them to Luma. Uni-1 supports multiple references (portrait, optional full-body, then user refs).
  if (allImages.length === 1) {
    body.image_prompt = allImages[0];
  } else if (allImages.length > 1) {
    body.image_prompt = allImages;
  }

  if (process.env.NODE_ENV !== 'production') {
    const ip = body.image_prompt;
    const kind = Array.isArray(ip) ? `array[len=${ip.length}]` : typeof ip === 'string' ? 'string' : 'none';
    const urls = Array.isArray(ip) ? ip : typeof ip === 'string' ? [ip] : [];
    console.log(`[Luma] image_prompt ${kind}: ${urls.length ? summarizeUrlsForDevLog(urls) : '(no reference images)'}`);
  }

  const generation = await lumaFetch('/generations', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const id = generation.id;
  let state = generation.state;
  let result = generation;
  const deadline = Date.now() + 120000;

  while (state !== 'completed' && state !== 'failed') {
    if (Date.now() > deadline) throw new Error(`Luma timed out`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    result = await lumaFetch(`/generations/${id}`);
    state = result.state;
  }

  if (state === 'failed') throw new Error(`Luma failed: ${result.failure_reason}`);

  const lumaUrl = result.output[0].url;
  const response = await fetch(lumaUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  return await uploadToSupabase(buffer, `post-luma-${id}.png`);
}

async function generateGeminiPost(
  prompt: string,
  aspectRatio: string = '1:1',
  characterImageUrls: string[] = [],
  referenceImages: string[] = []
) {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY)?.trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-image-preview" });

  const parts: any[] = [
    {
      text: `Generate a high-quality ${aspectRatio} social media post image based on the provided visual references and this prompt: ${prompt}.

    STRICT REQUIREMENTS:
    - IDENTITY: The first image (if any) is the character portrait. The second image (if any) is a full-body reference of the same person. You MUST maintain the exact facial features, skin tone, and identity — do not change gender, age, or ethnicity to match a scene stereotype.
    - REFERENCE: Any further images are optional user references (style, pose, product, or background).
    - QUALITY: Cinematic lighting, professional photography, 8k resolution.` }
  ];

  for (const url of characterImageUrls) {
    if (!url) continue;
    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const mimeType = response.headers.get('content-type') || 'image/png';
      parts.push({
        inlineData: {
          data: Buffer.from(buffer).toString('base64'),
          mimeType: mimeType.startsWith('image/') ? mimeType : 'image/png',
        }
      });
    } catch (e) {
      console.warn('Failed to fetch character image for Gemini:', e);
    }
  }

  for (const ref of referenceImages) {
    if (ref.startsWith('data:')) {
      const [mime, data] = ref.split(';base64,');
      parts.push({
        inlineData: {
          data,
          mimeType: mime.split(':')[1]
        }
      });
    } else if (ref.startsWith('http')) {
      try {
        const response = await fetch(ref);
        const buffer = await response.arrayBuffer();
        parts.push({
          inlineData: {
            data: Buffer.from(buffer).toString('base64'),
            mimeType: response.headers.get('content-type') || 'image/png'
          }
        });
      } catch (e) {
        console.warn('Failed to fetch reference image for Gemini:', e);
      }
    }
  }

  const result = await model.generateContent(parts);
  const response = await result.response;
  const imagePart = response.candidates?.[0]?.content.parts.find(p => p.inlineData?.mimeType.startsWith('image/'));

  if (!imagePart || !imagePart.inlineData) {
    throw new Error('Gemini failed to generate image');
  }

  const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
  return await uploadToSupabase(buffer, `post-gemini-${Date.now()}.png`);
}

async function generateVariant(
  prompt: string,
  aspectRatio: string = '1:1',
  characterImageUrls: string[] = [],
  referenceImages: string[] = []
) {
  try {
    console.log(`Attempting Luma generation for: ${prompt}`);
    return await generateLumaPost(prompt, aspectRatio, characterImageUrls, referenceImages);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const lumaUnavailable =
      message.includes('Payment Required') ||
      message.includes('LUMA_AGENTS_API_KEY is not set')
    if (lumaUnavailable) {
      console.info('Post image provider: skipping Luma (%s); using Gemini.', lumaUnavailable && message.includes('Payment Required') ? '402 billing' : 'missing key')
    } else {
      console.warn('Luma post generation failed, falling back to Gemini:', error)
    }
    try {
      return await generateGeminiPost(prompt, aspectRatio, characterImageUrls, referenceImages);
    } catch (geminiError: any) {
      console.error('Gemini fallback also failed:', geminiError);
      throw new Error(`Both Luma and Gemini failed: ${geminiError.message}`);
    }
  }
}

async function scheduleToZernio(
  userId: string,
  platform: string,
  mediaUrl: string,
  caption: string,
  scheduledAt?: string,
  mediaKind: 'image' | 'video' = 'image',
  postFormat?: string | null
) {
  const adminSupabase = createAdminClient();

  const { data: accounts } = await adminSupabase
    .from('social_accounts')
    .select('zernio_account_id')
    .eq('user_id', userId)
    .eq('platform', platform.toLowerCase());

  if (!accounts || accounts.length === 0) {
    console.warn(`No connected accounts found for platform: ${platform}`);
    return;
  }

  let instagramPsd: Record<string, unknown> | undefined;
  if (platform.toLowerCase() === 'instagram') {
    instagramPsd = await buildInstagramPlatformSpecificData(mediaUrl, mediaKind, postFormat);
  }

  const zernioPlatforms = accounts.map((acc) => ({
    platform: platform.toLowerCase(),
    accountId: acc.zernio_account_id,
    ...(instagramPsd ? { platformSpecificData: instagramPsd } : {}),
  }));

  try {
    const postResponse = await zernio.posts.createPost({
      content: caption || '',
      scheduledFor: scheduledAt,
      publishNow: !scheduledAt,
      timezone: 'UTC',
      mediaItems: [{ url: mediaUrl, type: mediaKind }],
      platforms: zernioPlatforms,
    });
    console.log('Post scheduled to Zernio:', postResponse.post?._id);
    return postResponse;
  } catch (error) {
    console.error('Failed to schedule post to Zernio:', error);
  }
}

export async function generatePostAction(data: any) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    // 1. Fetch Model Data to get Portrait URL (Strict Check)
    if (!data.modelId) return { success: false, error: 'No model selected' };

    const { data: modelData, error: modelError } = await adminSupabase
      .from('models')
      .select(
        'portrait_image_url, full_body_image_url, name, prompt, gender, vibe_aesthetic, hair_style_color, skin_tone, body_type, age_range'
      )
      .eq('id', data.modelId)
      .single();

    if (modelError || !modelData) {
      return { success: false, error: 'Selected model not found. Please select a valid influencer model.' };
    }

    const row = modelData as ModelRowForPost;
    const portrait = row.portrait_image_url?.trim();
    if (!portrait) {
      return { success: false, error: 'Selected model has no portrait image. Regenerate or pick another model.' };
    }

    const characterImageUrls = [
      ...new Set(
        [portrait, row.full_body_image_url?.trim()].filter(
          (u): u is string => typeof u === 'string' && u.length > 0
        )
      ),
    ];

    // 2. Deduct credits
    const { data: profile } = await adminSupabase.from('profiles').select('credits').eq('id', user.id).single();
    if (!profile || profile.credits < 10) return { success: false, error: 'Insufficient credits' };

    await adminSupabase.from('profiles').update({ credits: profile.credits - 10 }).eq('id', user.id);

    const identityPreamble = buildPostImageIdentityPreamble(row);
    const fromForm = buildPostImagePromptFromForm(data.briefData, data.visualData);
    const userNotes = typeof data.prompt === 'string' ? data.prompt.trim() : '';
    const sceneBlock = userNotes ? `${fromForm}\n\nAdditional direction: ${userNotes}` : fromForm;
    const prompt = `${identityPreamble}\n\n${sceneBlock}`;
    const aspectRatio = data.format === 'story' ? '9:16' : data.format === 'landscape' ? '16:9' : '1:1';

    // 3. Process reference images (upload base64 to Supabase if needed)
    const referenceImages = await Promise.all((data.referenceImages || []).map(async (img: string, i: number) => {
      if (img.startsWith('data:')) {
        const [header, base64Data] = img.split(';base64,');
        const mime = header.replace(/^data:/, '').trim() || 'image/png';
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = extensionForMime(mime);
        const fileName = `ref-${user.id}-${Date.now()}-${i}.${ext}`;
        return await uploadToSupabase(buffer, fileName, mime);
      }
      return img;
    }));

    // Generate 1 variant
    const results = await Promise.all([
      generateVariant(prompt, aspectRatio, characterImageUrls, referenceImages),
    ]);

    return {
      success: true,
      variants: results,
      creditsRemaining: profile.credits - 10
    };
  } catch (error: any) {
    console.error('Post Generation Error:', error);
    return { success: false, error: error.message };
  }
}

export async function getModelsAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase.from('models').select('*').eq('user_id', user.id);
  return data || [];
}

export async function savePostAction(postData: {
  modelId: string | null;
  imageUrl: string;
  platform: string | string[];
  caption: string;
  status: 'draft' | 'scheduled' | 'published';
  scheduledAt?: string;
  /** When omitted, inferred from URL when possible */
  mediaType?: 'image' | 'video';
  /** single | story | landscape | portrait — drives Instagram Story vs feed via Zernio */
  postFormat?: string | null;
}) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    const platforms = Array.isArray(postData.platform) ? postData.platform : [postData.platform];

    // Check plan limits for scheduled posts
    if (postData.status === 'scheduled') {
      const { data: profile } = await adminSupabase.from('profiles').select('plan').eq('id', user.id).single();
      const plan = profile?.plan || 'free';

      if (plan === 'free') {
        const { count } = await adminSupabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'scheduled');

        if (count !== null && count + platforms.length > 5) {
          return { success: false, error: 'Free plan limit reached (max 5 scheduled posts). Please upgrade.' };
        }
      }
    }

    const inserts = platforms.map(platform => ({
      user_id: user.id,
      model_id: postData.modelId,
      image_url: postData.imageUrl,
      platform: platform,
      caption: postData.caption,
      status: postData.status,
      scheduled_at: postData.scheduledAt || null,
      post_format: postData.postFormat ?? null,
    }));

    const mediaKind = postData.mediaType ?? inferMediaKindFromUrl(postData.imageUrl);

    const { data, error } = await adminSupabase
      .from('posts')
      .insert(inserts)
      .select();

    if (error) {
      console.error('Error saving post(s):', error);
      return { success: false, error: error.message };
    }

    // 4. If scheduled, send to Zernio
    if (postData.status === 'scheduled' || postData.status === 'published') {
      for (const platform of platforms) {
        await scheduleToZernio(
          user.id,
          platform,
          postData.imageUrl,
          postData.caption,
          postData.status === 'scheduled' ? postData.scheduledAt : undefined,
          mediaKind,
          postData.postFormat ?? null
        );
      }
    }

    return { success: true, posts: data };
  } catch (error: any) {
    console.error('Save Post Error:', error);
    return { success: false, error: error.message };
  }
}

export async function getRecentPostsAction(page: number = 1, limit: number = 8) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized', posts: [], totalCount: 0 };

    const offset = (page - 1) * limit;

    // Get posts with total count
    const { data, error, count } = await supabase
      .from('posts')
      .select('*, models(name)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching posts:', error);
      return { success: false, error: error.message, posts: [], totalCount: 0 };
    }

    return {
      success: true,
      posts: data || [],
      totalCount: count || 0,
      hasMore: (count || 0) > offset + limit
    };
  } catch (error: any) {
    console.error('Get Recent Posts Error:', error);
    return { success: false, error: error.message, posts: [], totalCount: 0 };
  }
}

export async function updatePostAction(postId: string, updates: {
  status?: 'draft' | 'scheduled' | 'published';
  scheduledAt?: string | null;
  caption?: string;
  platform?: string;
}) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    const { scheduledAt, ...rest } = updates;
    const updatePayload: any = { ...rest };
    if (scheduledAt !== undefined) {
      updatePayload.scheduled_at = scheduledAt;
    }

    // Check limits if changing status to scheduled
    if (updatePayload.status === 'scheduled') {
      const { data: profile } = await adminSupabase.from('profiles').select('plan').eq('id', user.id).single();
      const plan = profile?.plan || 'free';

      if (plan === 'free') {
        const { count } = await adminSupabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'scheduled');

        if (count !== null && count >= 5) {
          return { success: false, error: 'Free plan limit reached (max 5 scheduled posts). Please upgrade.' };
        }
      }
    }

    const { data, error } = await adminSupabase
      .from('posts')
      .update(updatePayload)
      .eq('id', postId)
      .eq('user_id', user.id) // Security check
      .select()
      .single();

    if (error) {
      console.error('Error updating post:', error);
      return { success: false, error: error.message };
    }

    // Trigger Zernio if status changed to scheduled/published or if scheduledAt/caption changed for a scheduled post
    if (data.status === 'scheduled' || data.status === 'published') {
      await scheduleToZernio(
        user.id,
        data.platform,
        data.image_url,
        data.caption,
        data.status === 'scheduled' ? data.scheduled_at : undefined,
        inferMediaKindFromUrl(data.image_url),
        (data as { post_format?: string | null }).post_format ?? null
      );
    }

    return { success: true, post: data };
  } catch (error: any) {
    console.error('Update Post Error:', error);
    return { success: false, error: error.message };
  }
}

export async function getScheduledPostsAction(month: number, year: number) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized', posts: [] };

    // Format start and end of month literally to match stored format
    const m = String(month + 1).padStart(2, '0');
    const lastDay = new Date(year, month + 1, 0).getDate();
    const startOfMonth = `${year}-${m}-01T00:00:00`;
    const endOfMonth = `${year}-${m}-${lastDay}T23:59:59`;

    const { data, error } = await supabase
      .from('posts')
      .select('*, models(name)')
      .eq('user_id', user.id)
      .eq('status', 'scheduled')
      .gte('scheduled_at', startOfMonth)
      .lte('scheduled_at', endOfMonth)
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Error fetching scheduled posts:', error);
      return { success: false, error: error.message, posts: [] };
    }

    return { success: true, posts: data || [] };
  } catch (error: any) {
    console.error('Get Scheduled Posts Error:', error);
    return { success: false, error: error.message, posts: [] };
  }
}

export async function getDraftPostsAction() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized', posts: [] };

    const { data, error } = await supabase
      .from('posts')
      .select('*, models(name)')
      .eq('user_id', user.id)
      .eq('status', 'draft')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching draft posts:', error);
      return { success: false, error: error.message, posts: [] };
    }

    return { success: true, posts: data || [] };
  } catch (error: any) {
    console.error('Get Draft Posts Error:', error);
    return { success: false, error: error.message, posts: [] };
  }
}

export async function generateCaptionAction(params: {
  tone: string;
  cta: string;
  language: string;
  hashtags: number;
  emojiDensity: string;
  briefData?: any;
  visualData?: VisualDataInput | null;
}) {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY)?.trim();
  if (!apiKey) return { success: false, error: 'GEMINI_API_KEY is not set.' };

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const visualLine = formatVisualContextForCaption(params.visualData);
    const prompt = `Generate a social media caption with the following requirements:
- Tone: ${params.tone}
- Language: ${params.language}
${captionLanguageInstructions(params.language)}
- Call to Action: ${params.cta}
- Number of hashtags: ${params.hashtags}
- Emoji Density: ${params.emojiDensity}
${params.briefData?.campaignName ? `- Campaign Name: ${params.briefData.campaignName}` : ''}
${params.briefData?.product ? `- Product/Brand: ${params.briefData.product}` : ''}
${params.briefData?.goal ? `- Goal: ${params.briefData.goal}` : ''}
${params.briefData?.brief ? `- Detailed Brief: ${params.briefData.brief}` : ''}
${visualLine ? `- Visual context (caption should loosely match this imagery): ${visualLine}` : ''}

Please return ONLY the generated caption text. Do not include any quotes or prefixes.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return { success: true, caption: text.trim() };
  } catch (error: any) {
    console.error('Caption Generation Error:', error);
    return { success: false, error: error.message };
  }
}
