import * as fs from 'fs/promises';
import jsPDF from 'jspdf';
import path from 'path';

export const loadFontsFromPublic = async (pdf: jsPDF): Promise<boolean> => {
  try {
    // Updated paths to match your actual file structure
    const fontPromises = [
      loadFontFromFile('/assets/fonts/ttf/ClashGrotesk-Regular.ttf'),
      loadFontFromFile('/assets/fonts/ttf/ClashGrotesk-Bold.ttf'),
      loadFontFromFile('/assets/fonts/ttf/ClashGrotesk-Light.ttf'),
      loadFontFromFile('/assets/fonts/ttf/ClashGrotesk-Medium.ttf'),
    ];

    const responses = await Promise.all(fontPromises);
    let fontsLoaded = 0;

    // Add fonts to jsPDF with correct names
    const fontConfigs = [
      { name: 'ClashGrotesk-Regular.ttf', family: 'ClashGrotesk', style: 'normal' },
      { name: 'ClashGrotesk-Bold.ttf', family: 'ClashGrotesk', style: 'bold' },
      { name: 'ClashGrotesk-Light.ttf', family: 'ClashGrotesk', style: 'light' },
      { name: 'ClashGrotesk-Medium.ttf', family: 'ClashGrotesk', style: 'medium' },
    ];

    responses.forEach((base64, index) => {
      if (base64) {
        try {
          const config = fontConfigs[index];
          pdf.addFileToVFS(config.name, base64);
          pdf.addFont(config.name, config.family, config.style);
          fontsLoaded++;
        } catch (fontError) {
          console.warn(`Failed to load font ${index}:`, fontError);
        }
      }
    });

    console.log(`Loaded ${fontsLoaded} custom fonts`);
    return fontsLoaded > 0;
  } catch (error) {
    console.warn('Could not load custom fonts, using defaults:', error);
    return false;
  }
};

const loadFontFromFile = async (fontPath: string): Promise<string | any> => {
  try {
    const fullPath = path.join(process.cwd(), 'public', fontPath);
    const fontBuffer = await fs.readFile(fullPath);
    return fontBuffer.toString('base64');
  } catch (error) {
    console.warn(`Could not load font: ${fontPath}`, error);
    return null;
  }
};
