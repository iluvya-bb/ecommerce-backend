
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

exports.transcodeVideo = (inputPath, outputDir) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    ffmpeg(inputPath)
      .outputOptions([
        "-preset veryfast",
        "-keyint_min 25",
        "-g 250",
        "-sc_threshold 0",
        "-c:v libx264",
        "-pix_fmt yuv420p",
        "-c:a aac",
        "-b:a 128k",
        "-ac 1",
        "-ar 44100",
        "-map 0:v:0",
        "-map 0:a:0",
        "-b:v:0 5000k",
        "-s:v:0 1920x1080",
        "-map 0:v:0",
        "-map 0:a:0",
        "-b:v:1 2500k",
        "-s:v:1 1280x720",
        "-map 0:v:0",
        "-map 0:a:0",
        "-b:v:2 1000k",
        "-s:v:2 854x480",
        "-var_stream_map",
        'v:0,a:0,name:1080p v:1,a:1,name:720p v:2,a:2,name:480p',
        "-master_pl_name master.m3u8",
        "-f hls",
        "-hls_time 6",
        "-hls_list_size 0",
        `-hls_segment_filename ${outputDir}/%v/segment%03d.ts`,
      ])
      .output(`${outputDir}/%v/index.m3u8`)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });
};
