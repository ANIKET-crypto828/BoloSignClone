/**
 * Complete coordinate conversion system for PDF signature injection
 * Handles the transformation between:
 * - PDF coordinates (points, bottom-left origin)
 * - Screen coordinates (pixels, top-left origin)
 * - Percentage coordinates (0-100%, resolution-agnostic)
 */

// Type definitions
export type PdfPageInfo = {
  pageNumber: number;
  widthPoints: number;    // PDF page width in points (1 point = 1/72 inch)
  heightPoints: number;   // PDF page height in points
  widthPixels: number;    // Rendered width in screen pixels
  heightPixels: number;   // Rendered height in screen pixels
  scale: number;          // Scale factor (pixels per point)
};

export type ScreenRect = {
  x: number;      // pixels from left (top-left origin)
  y: number;      // pixels from top (top-left origin)
  width: number;  // pixels
  height: number; // pixels
};

export type PdfRect = {
  x: number;      // points from left (bottom-left origin)
  y: number;      // points from bottom (bottom-left origin)
  width: number;  // points
  height: number; // points
};

export type PercentRect = {
  xPct: number;     // 0-100% from left
  yPct: number;     // 0-100% from bottom (PDF convention)
  widthPct: number; // 0-100%
  heightPct: number; // 0-100%
};

/**
 * Convert screen coordinates (top-left origin) to PDF points (bottom-left origin)
 */
export function screenToPdf(screen: ScreenRect, pageInfo: PdfPageInfo): PdfRect {
  const { widthPoints, heightPoints, widthPixels, heightPixels } = pageInfo;
  
  // Convert pixels to points using the scale factor
  const xPoints = (screen.x / widthPixels) * widthPoints;
  const widthPoints_ = (screen.width / widthPixels) * widthPoints;
  const heightPoints_ = (screen.height / heightPixels) * heightPoints;
  
  // Flip Y-axis: screen Y is from top, PDF Y is from bottom
  const yTopPixels = screen.y;
  const yBottomPixels = heightPixels - yTopPixels - screen.height;
  const yPoints = (yBottomPixels / heightPixels) * heightPoints;
  
  return {
    x: xPoints,
    y: yPoints,
    width: widthPoints_,
    height: heightPoints_
  };
}

/**
 * Convert PDF points (bottom-left origin) to screen pixels (top-left origin)
 */
export function pdfToScreen(pdf: PdfRect, pageInfo: PdfPageInfo): ScreenRect {
  const { widthPoints, heightPoints, widthPixels, heightPixels } = pageInfo;
  
  // Convert points to pixels
  const xPixels = (pdf.x / widthPoints) * widthPixels;
  const widthPixels_ = (pdf.width / widthPoints) * widthPixels;
  const heightPixels_ = (pdf.height / heightPoints) * heightPixels;
  
  // Flip Y-axis: PDF Y is from bottom, screen Y is from top
  const yBottomPixels = (pdf.y / heightPoints) * heightPixels;
  const yTopPixels = heightPixels - yBottomPixels - heightPixels_;
  
  return {
    x: xPixels,
    y: yTopPixels,
    width: widthPixels_,
    height: heightPixels_
  };
}

/**
 * Convert screen coordinates to percentage (resolution-agnostic storage)
 */
export function screenToPercent(screen: ScreenRect, pageInfo: PdfPageInfo): PercentRect {
  const { widthPixels, heightPixels } = pageInfo;
  
  const xPct = (screen.x / widthPixels) * 100;
  const widthPct = (screen.width / widthPixels) * 100;
  
  // Calculate Y percentage from bottom (PDF convention)
  const yTopPct = (screen.y / heightPixels) * 100;
  const heightPct = (screen.height / heightPixels) * 100;
  const yPct = 100 - yTopPct - heightPct; // from bottom
  
  return {
    xPct,
    yPct,
    widthPct,
    heightPct
  };
}

/**
 * Convert percentage to screen coordinates
 */
export function percentToScreen(percent: PercentRect, pageInfo: PdfPageInfo): ScreenRect {
  const { widthPixels, heightPixels } = pageInfo;
  
  const x = (percent.xPct / 100) * widthPixels;
  const width = (percent.widthPct / 100) * widthPixels;
  const height = (percent.heightPct / 100) * heightPixels;
  
  // Convert Y from bottom to top
  const yFromBottom = (percent.yPct / 100) * heightPixels;
  const y = heightPixels - yFromBottom - height;
  
  return { x, y, width, height };
}

/**
 * Convert percentage directly to PDF points (for backend)
 */
export function percentToPdf(percent: PercentRect, pageInfo: PdfPageInfo): PdfRect {
  const { widthPoints, heightPoints } = pageInfo;
  
  return {
    x: (percent.xPct / 100) * widthPoints,
    y: (percent.yPct / 100) * heightPoints,
    width: (percent.widthPct / 100) * widthPoints,
    height: (percent.heightPct / 100) * heightPoints
  };
}

/**
 * Convert PDF points to percentage (for storage)
 */
export function pdfToPercent(pdf: PdfRect, pageInfo: PdfPageInfo): PercentRect {
  const { widthPoints, heightPoints } = pageInfo;
  
  return {
    xPct: (pdf.x / widthPoints) * 100,
    yPct: (pdf.y / heightPoints) * 100,
    widthPct: (pdf.width / widthPoints) * 100,
    heightPct: (pdf.height / heightPoints) * 100
  };
}

/**
 * Extract PDF page info from react-pdf Page component
 */
export function extractPageInfo(
  page: any, // PDFPageProxy from pdfjs
  renderedWidth: number
): PdfPageInfo {
  const viewport = page.getViewport({ scale: 1 });
  const scale = renderedWidth / viewport.width;
  const scaledViewport = page.getViewport({ scale });
  
  return {
    pageNumber: page.pageNumber,
    widthPoints: viewport.width,
    heightPoints: viewport.height,
    widthPixels: scaledViewport.width,
    heightPixels: scaledViewport.height,
    scale
  };
}