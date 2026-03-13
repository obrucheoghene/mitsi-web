import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

export type BackgroundMode = 'none' | 'blur' | 'image';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm';

class BackgroundService {
  private segmenter: ImageSegmenter | null = null;
  private animFrameId: number | null = null;

  // Canvases
  private outputCanvas: HTMLCanvasElement;
  private outputCtx: CanvasRenderingContext2D;
  private maskCanvas: HTMLCanvasElement;
  private maskCtx: CanvasRenderingContext2D;
  private personCanvas: HTMLCanvasElement;
  private personCtx: CanvasRenderingContext2D;

  private video: HTMLVideoElement;
  private mode: BackgroundMode = 'none';
  private bgImage: HTMLImageElement | null = null;
  private outputTrack: MediaStreamTrack | null = null;
  private blurAmount = 14;

  constructor() {
    this.outputCanvas = document.createElement('canvas');
    this.outputCtx = this.outputCanvas.getContext('2d')!;
    this.maskCanvas = document.createElement('canvas');
    this.maskCtx = this.maskCanvas.getContext('2d')!;
    this.personCanvas = document.createElement('canvas');
    this.personCtx = this.personCanvas.getContext('2d')!;
    this.video = document.createElement('video');
    this.video.autoplay = true;
    this.video.muted = true;
    this.video.playsInline = true;
  }

  private async loadSegmenter(): Promise<void> {
    if (this.segmenter) return;
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    this.segmenter = await ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      outputCategoryMask: true,
      outputConfidenceMasks: false,
    });
  }

  async start(
    sourceTrack: MediaStreamTrack,
    mode: BackgroundMode,
    bgImageSrc?: string
  ): Promise<MediaStreamTrack> {
    this.mode = mode;

    const settings = sourceTrack.getSettings();
    const w = settings.width || 640;
    const h = settings.height || 480;

    [this.outputCanvas, this.maskCanvas, this.personCanvas].forEach(c => {
      c.width = w;
      c.height = h;
    });

    this.video.srcObject = new MediaStream([sourceTrack]);
    await this.video.play().catch(() => {});

    if (bgImageSrc) await this.loadBgImage(bgImageSrc);
    await this.loadSegmenter();

    this.startLoop();

    const stream = this.outputCanvas.captureStream(30);
    this.outputTrack = stream.getVideoTracks()[0];
    return this.outputTrack;
  }

  setMode(mode: BackgroundMode, bgImageSrc?: string): void {
    this.mode = mode;
    if (bgImageSrc) this.loadBgImage(bgImageSrc).catch(() => {});
  }

  setBlurAmount(amount: number): void {
    this.blurAmount = amount;
  }

  stop(): void {
    if (this.animFrameId != null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.video.srcObject) {
      this.video.srcObject = null;
    }
    this.outputTrack = null;
  }

  private async loadBgImage(src: string): Promise<void> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        this.bgImage = img;
        resolve();
      };
      img.onerror = () => resolve();
      img.src = src;
    });
  }

  private startLoop(): void {
    if (this.animFrameId != null) cancelAnimationFrame(this.animFrameId);
    const loop = (ts: number) => {
      this.processFrame(ts);
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private processFrame(timestamp: number): void {
    if (!this.segmenter || this.video.readyState < 2) return;

    const { width: w, height: h } = this.outputCanvas;

    const result = this.segmenter.segmentForVideo(this.video, timestamp);
    const mask = result.categoryMask;

    if (!mask) {
      this.outputCtx.drawImage(this.video, 0, 0, w, h);
      return;
    }

    const maskData = mask.getAsUint8Array();
    const maskW = mask.width;
    const maskH = mask.height;

    // Resize maskCanvas to the model's native mask resolution if needed
    if (this.maskCanvas.width !== maskW || this.maskCanvas.height !== maskH) {
      this.maskCanvas.width = maskW;
      this.maskCanvas.height = maskH;
    }

    // Build person mask at native mask resolution: alpha = 255 where person (category 1)
    const maskImageData = this.maskCtx.createImageData(maskW, maskH);
    for (let i = 0; i < maskData.length; i++) {
      maskImageData.data[i * 4 + 3] = maskData[i] === 1 ? 255 : 0;
    }
    this.maskCtx.putImageData(maskImageData, 0, 0);

    // Draw person (sharp video) clipped to mask, scaling mask to output canvas size
    this.personCtx.clearRect(0, 0, w, h);
    this.personCtx.drawImage(this.video, 0, 0, w, h);
    this.personCtx.globalCompositeOperation = 'destination-in';
    this.personCtx.drawImage(this.maskCanvas, 0, 0, maskW, maskH, 0, 0, w, h);
    this.personCtx.globalCompositeOperation = 'source-over';

    // Compose output: background + person
    if (this.mode === 'blur') {
      this.outputCtx.filter = `blur(${this.blurAmount}px)`;
      this.outputCtx.drawImage(this.video, 0, 0, w, h);
      this.outputCtx.filter = 'none';
    } else if (this.mode === 'image' && this.bgImage) {
      this.outputCtx.drawImage(this.bgImage, 0, 0, w, h);
    } else {
      this.outputCtx.drawImage(this.video, 0, 0, w, h);
    }

    this.outputCtx.drawImage(this.personCanvas, 0, 0);

    mask.close();
  }
}

// Singleton
let _instance: BackgroundService | null = null;
export const getBackgroundService = (): BackgroundService => {
  if (!_instance) _instance = new BackgroundService();
  return _instance;
};

// Module-level reference to the active processed track for local preview.
// Stored outside React so it can be read synchronously without triggering renders.
let _activeOutputTrack: MediaStreamTrack | null = null;
export const getActiveOutputTrack = (): MediaStreamTrack | null => _activeOutputTrack;
export const setActiveOutputTrack = (t: MediaStreamTrack | null): void => {
  _activeOutputTrack = t;
};
