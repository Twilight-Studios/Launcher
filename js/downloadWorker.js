const fs = require("fs");
const axios = require("axios");

let cancelling = false;
let fileStream;
let intervalId;

process.on("message", (message) => {
	if (message.action === "cancel") {
		cancelling = true;
		
		if (fileStream) {
			fileStream.close(() => {
				process.send({ status: "cancelled" });
				
				if (intervalId)
			  		clearInterval(intervalId);
				
				process.exit(0);
		  	});
		}
		return;
	}
  
	const { downloadUrl, outputPath, payload } = message;
  
	axios({
		method: "post",
		url: downloadUrl,
		responseType: "stream",
		data: payload,
	}).then((response) => {

		const totalSize = parseInt(response.headers["content-length"], 10);
		let downloadedBytes = 0;
		let intervalDownloadedBytes = 0;
		let lastTime = Date.now();

		fileStream = fs.createWriteStream(outputPath);
		response.data.pipe(fileStream);

		const reportProgress = () => {
			const currentTime = Date.now();
			const timeDiff = (currentTime - lastTime) / 1000;

			let downloadSpeed = 0;
			if (timeDiff > 0)
				downloadSpeed = intervalDownloadedBytes / timeDiff / 1000000;

			const progress = (downloadedBytes / totalSize) * 100;

			process.send({
				status: "in_progress",
				downloadedBytes,
				totalSize,
				downloadSpeed: downloadSpeed.toFixed(2),
				progress: progress.toFixed(0),
			});

			intervalDownloadedBytes = 0;
			lastTime = currentTime;
		};

		intervalId = setInterval(reportProgress, 1000);

		response.data.on("data", (chunk) => {
			if (cancelling) {

				fileStream.close(() => {
					process.send({ status: "cancelled" });
					clearInterval(intervalId);
					process.exit(0);
				});

				return;
			}

			downloadedBytes += chunk.length;
			intervalDownloadedBytes += chunk.length;
		});

		fileStream.on("finish", () => {

			clearInterval(intervalId);

			if (!cancelling) {
			  process.send({ status: "success" });
			  process.exit(0);
			}

		});

		fileStream.on("error", (err) => {
			clearInterval(intervalId);
			process.send({ status: "error", error: err.message });
		});

		response.data.on("end", () => {
			
			clearInterval(intervalId);

			if (cancelling) {
			  process.send({ status: "cancelled" });
			  process.exit(0);
			}

		});

	}).catch((error) => {
		process.send({ status: "error", error: error.message });
		process.exit(0);
	});
});
