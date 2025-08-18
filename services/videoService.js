
const ffmpeg = require("fluent-ffmpeg");

const compressVideo = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .on("end", () => {
        console.log("Video compression finished.");
        resolve();
      })
      .on("error", (err) => {
        console.error("Error during video compression:", err);
        reject(err);
      })
      .run();
  });
};

module.exports = { compressVideo };
