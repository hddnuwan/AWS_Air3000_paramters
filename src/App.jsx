import React, { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveAs } from "file-saver";

export default function AwsAir3000Form() {
  const [awsInput, setAwsInput] = useState("");
  const [airInput, setAirInput] = useState("");
  const [outputFileName, setOutputFileName] = useState("AWS IoT Shadow vs Air3000 Display Parameter Comparison Device_");

  const parseAwsData = useCallback((text) => {
    const awsData = {};
    const pattern = /"([^"\n]+)":\s*(\d+(\.\d+)?)/g;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      awsData[match[1].trim()] = match[2];
    }
    return awsData;
  }, []);

  const parseAirData = useCallback((text) => {
    const airData = {};
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    let currentParam = null;
    for (const line of lines) {
      if (/^\d+#/.test(line) || ["Env Tp C", "Env Humi C%", "DewPoint C", "Ele Box C"].includes(line)) {
        currentParam = line;
      } else if (currentParam && (/^[-+]?\d+(\.\d+)?$/.test(line) || line.includes("/"))) {
        airData[currentParam] = line;
        currentParam = null;
      }
    }
    return airData;
  }, []);

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result;
      const isAws = /"[^"\n]+":\s*\d+/.test(content);
      const isAir = /^\d+#.*\n[-+]?\d+(\.\d+)?/m.test(content);
      if (isAws) setAwsInput(content);
      else if (isAir) setAirInput(content);
    };
    reader.readAsText(file);
  }, []);

  const mergeAndDownload = useCallback(() => {
    if (!awsInput.trim() || !airInput.trim()) {
      alert("Please provide both AWS and Air3000 datasets before starting the comparison.");
      return;
    }

    const awsData = parseAwsData(awsInput);
    const airData = parseAirData(airInput);

    const lines = [];
    const allKeys = new Set([...Object.keys(awsData), ...Object.keys(airData)]);

    allKeys.forEach((key) => {
      const awsVal = awsData[key] || "";
      const airVal = airData[key] || "";
      lines.push(`${key}: AWS=${awsVal} \t Air3000=${airVal}`);
    });

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `${outputFileName.trim() || "output"}.txt`);
  }, [awsInput, airInput, outputFileName, parseAwsData, parseAirData]);

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">AWS IoT vs Air3000 Parameter Comparison</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className="border p-4 rounded-lg min-h-[200px] bg-gray-100"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
        >
          <label className="font-medium">AWS IoT Shadow Data (Paste or Drop .txt)</label>
          <textarea
            value={awsInput}
            onChange={(e) => setAwsInput(e.target.value)}
            placeholder="Paste AWS JSON-like data here..."
            className="mt-2 p-2 border w-full h-32"
          />
        </div>

        <div
          className="border p-4 rounded-lg min-h-[200px] bg-gray-100"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
        >
          <label className="font-medium">Air3000 Raw Data (Paste or Drop .txt)</label>
          <textarea
            value={airInput}
            onChange={(e) => setAirInput(e.target.value)}
            placeholder="Paste Air3000 sensor data here..."
            className="mt-2 p-2 border w-full h-32"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="font-medium">Output File Name</label>
        <input
          type="text"
          value={outputFileName}
          onChange={(e) => setOutputFileName(e.target.value)}
          className="mt-2 p-2 border w-full"
        />
      </div>

      <button onClick={mergeAndDownload} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
        Start Comparison & Download Output
      </button>
    </div>
  );
}
