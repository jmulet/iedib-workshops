const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Utility to extract optimized WebP frames from an MP4 video.
 * Usage: node extract-frames.js <videoPath> <start> <end> <numFrames> [outputDir] [startIndex]
 * Example: node util/extract-frames.js myvid.mp4 00:00:05 00:00:15 60 ./frames 10
 */

const args = process.argv.slice(2);

if (args.length < 4) {
    console.log('Usage: node extract-frames.js <videoPath> <start> <end> <numFrames> [outputDir] [startIndex]');
    console.log('Example: node extract-frames.js sample.mp4 10 20 60 ./output 1');
    process.exit(1);
}

const [videoPath, start, end, numFrames, outputDirArg, startIndexArg] = args;
const outputDir = outputDirArg || './extracted_frames';
const startIndex = parseInt(startIndexArg || '0');

// Check if ffmpeg is available
try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
} catch (e) {
    console.error('Error: ffmpeg is not installed or not in PATH.');
    process.exit(1);
}

// Ensure output directory exists
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

console.log(`--- Extracting ${numFrames} frames ---`);
console.log(`Video: ${videoPath}`);
console.log(`Range: ${start} to ${end} (${duration}s)`);
console.log(`Calculating FPS: ${fps.toFixed(4)}`);
console.log(`Output directory: ${outputDir}`);
console.log(`Starting index: ${startIndex}`);

// Build ffmpeg command
// -ss before -i for fast seeking
// -t for duration
// -vf fps sets the capture rate
// -start_number sets the first frame index
// -f image2 forces individual image files
// -vcodec libwebp ensures single-frame output
const outputPattern = path.join(outputDir, 'frame_%04d.webp');
const cmd = `ffmpeg -ss ${start} -t ${duration} -i "${videoPath}" -vf "fps=${fps}" -f image2 -vcodec libwebp -start_number ${startIndex} -q:v 75 -compression_level 6 -lossless 0 -an "${outputPattern}"`;

console.log(`Running: ${cmd}`);

try {
    execSync(cmd, { stdio: 'inherit' });
    console.log('\n--- Extraction Complete ---');
    console.log(`Frames saved to: ${outputDir}`);
    console.log('You can now use these in ibgsap.js with pattern: frames/frame_{i}.webp (pad 4)');
} catch (error) {
    console.error('\nError during extraction:', error.message);
}
