
declare const cocoSsd: any;

let model: any = null;

export const loadModel = async () => {
  if (model) return model;
  try {
    model = await cocoSsd.load();
    return model;
  } catch (error) {
    console.error("Failed to load COCO-SSD model:", error);
    return null;
  }
};

export const detectImage = async (imageElement: HTMLImageElement | HTMLVideoElement) => {
  const m = await loadModel();
  if (!m) return [];
  return await m.detect(imageElement);
};

export const CATEGORIES = [
  'dog', 'cat', 'car', 'person', 'bicycle', 'motorcycle', 'bird', 'bottle', 'chair', 'laptop'
];

export const getRandomCategory = () => CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

export const getPlaceholderImage = (category: string) => 
  `https://loremflickr.com/400/400/${category}?lock=${Math.floor(Math.random() * 1000)}`;
