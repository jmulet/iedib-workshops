const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Utility to generate a vertical WebP sprite sheet from an MP4 video.
 * Usage: node generate-sprite.js <videoPath> <start> <end> <numFrames> [outputPath] [width]
 * Example: node util/generate-sprite.js sample.mp4 00:00:05 00:00:15 60 ./output/sprite.webp 1280
 */

const args = process.argv.slice(2);

if (args.length < 4) {
    console.log('Usage: node generate-sprite.js <videoPath> <start> <end> <numFrames> [outputPath] [width]');
    console.log('Example: node generate-sprite.js sample.mp4 10 20 60 ./output/sprite.webp 1280');
    process.exit(1);
}

let [videoPath, start, end, numFramesArg, outputPathArg, widthArg, columnsArg] = args;
const numFrames = parseInt(numFramesArg);
const columns = parseInt(columnsArg || '10');
let outputPath = outputPathArg || './sprite.webp';

if (!path.extname(outputPath)) {
    outputPath += '.webp';
}

// Check if ffmpeg is available
try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
} catch (e) {
    console.error('Error: ffmpeg is not installed or not in PATH.');
    process.exit(1);
}

// Ensure output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Parse time string (HH:MM:SS or seconds) to seconds
 */
function parseTime(time) {
    if (typeof time === 'number') return time;
    if (!time.includes(':')) return parseFloat(time);
    const parts = time.split(':').map(parseFloat);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parseFloat(time);
}

const tStart = parseTime(start);
const tEnd = parseTime(end);
const duration = tEnd - tStart;

if (duration <= 0) {
    console.error('Error: End time must be greater than start time.');
    process.exit(1);
}

// Calculate framerate needed for exactly numFrames
const fps = numFrames / duration;
const rows = Math.ceil(numFrames / columns);

console.log(`--- Generating Tiled Sprite Grid (${numFrames} frames) ---`);
console.log(`Video: ${videoPath}`);
console.log(`Range: ${start} to ${end} (${duration}s)`);
console.log(`Layout: ${columns} columns x ${rows} rows`);
console.log(`Output: ${outputPath}`);

// Build ffmpeg filter
let scaleFilter = widthArg ? `scale=${widthArg}:-2` : 'scale=-2:ih';

// Double seek strategy: fast seek near tStart for performance, then accurate frame-level
// seek for the remaining offset. setpts resets PTS to 0 so fps starts from the exact frame.
const filter = `setpts=PTS-STARTPTS,fps=${fps},${scaleFilter},tile=${columns}x${rows}`;
const seekBefore = Math.max(0, tStart - 2);
const accurateSeek = tStart - seekBefore;
const cmd = `ffmpeg -ss ${seekBefore} -i "${videoPath}" -ss ${accurateSeek} -t ${duration} -vf "${filter}" -vframes 1 -an -vcodec libwebp -q:v 75 -compression_level 6 -lossless 0 "${outputPath}" -y`;

console.log(`\nRunning: ${cmd}`);

try {
    execSync(cmd, { stdio: 'inherit' });
    console.log('\n--- Sprite Generation Complete ---');
    console.log(`File saved to: ${outputPath}`);
} catch (error) {
    console.error('\nError during sprite generation:', error.message);
    console.log('\nTip: If the error is about image size, try reducing the width or the number of frames.');
}
