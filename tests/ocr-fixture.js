/**
 * Real OCR output, not an invention.
 *
 * This is what Tesseract returned for a photograph of a SkyBlock tooltip taken
 * with a phone off a monitor, after `src/tooltip-scanner.js` cropped it to the
 * tooltip and prepared it. Every mangling in it -- V read as U, M read as H, the
 * title line truncated to "Melon |" -- is a real failure mode of that font under
 * a camera, which is why the parser is tested against this rather than against
 * clean text.
 *
 * The item is a Bountiful Melon Dicer Mk. III with Crop Fever II, Cultivating X,
 * Dedication III, Delicate V, Efficiency V, Harvesting VI and Turbo-Melon VI.
 */
export const PHOTOGRAPHED_TOOLTIP_OCR = 'BOUNTIFUL Melon |\nFarming Tool    te\n\nFarming Fortune: mL ¢\nNelan Slee Boren  C+) C47) Ghd\nSpeed: #8.-5)) 0 - Ki il] Tir és\nFarming Wisdom: 61:3     |\nGemstones: FI (7106\n\nCrop Fever II\nCultivating X\nDedication III\nDelicate WU\nEfficiency U\nHarvesting UI\nTurbo-Melon UI\n\nRinast identical to the Helon Dicer Mk.\nI, but it has tik. II in the mane!\n\nO Part of a Toolkit!\nSneak + Right-click to switch tools!\n\nLevel 46.-> 47 <24n/4ip\n—\n\nBountiful Bonus\nGrants +8.2 coins per CroP.\n\n= Soulbound *                :\n» LEGENDARY FARMING TOOL «\n\nEst. Item Value:   o7249,832,8 Cains\nObtained:           August 21, 2626\nMuseum (Farning® % Hot Donated\nCultivated Crops: 124M (Maxed?\n\nee oth mek FOUN\n';
