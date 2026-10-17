require("dotenv").config();

const connectDB = require("./config/db");
const { spawn } = require("child_process");
const path = require("path");

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "FarmerAdvisor Backend is Running!",
        status: "success"
    });
});

// Example API route for the frontend
app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        project: "AI-Powered Farmer Advisory and Knowledge-Sharing Platform"
    });
});



app.post("/api/assistant", (req, res) => {
    const question = req.body.question;

    if (!question || !question.trim()) {
        return res.status(400).json({
            success: false,
            answer: "Please enter your farming question."
        });
    }

    const text = question.toLowerCase();
    let answer = "";

    if (text.includes("tomato")) {
        answer = "Tomato plants need suitable sunlight, well-drained soil, and consistent watering. Check plants regularly for pests and leaf diseases.";
    } else if (text.includes("yellow") || text.includes("leaves")) {
        answer = "Yellow leaves can result from watering problems, nutrient deficiencies, pests, or disease. Check soil moisture and inspect the affected leaves before choosing a treatment.";
    } else if (text.includes("water") || text.includes("irrigation")) {
        answer = "Check soil moisture before irrigation. Water requirements depend on the crop, soil type, weather, and growth stage.";
    } else if (text.includes("fertilizer") || text.includes("fertiliser")) {
        answer = "Choose fertilizer based on soil testing and crop requirements. Avoid applying excess fertilizer without checking nutrient needs.";
    } else if (text.includes("pest") || text.includes("insect")) {
        answer = "Inspect the crop for insects and signs of damage. Identify the pest before choosing a control method, and follow local agricultural expert guidance.";
    } else if (text.includes("weather") || text.includes("rain")) {
        answer = "Check a reliable local weather forecast before irrigation, spraying, or harvesting. Avoid relying on this demo chatbot for live weather information.";
    } else if (text.includes("salt")) {
        answer = "For the Wadala Salt Pan project, keep records of daily production, rainfall, evaporation conditions, stock, and sales. These records can support future analysis.";
    } else if (text.includes("hello") || text.includes("hi")) {
        answer = "Hello! Welcome to FarmerAdvisor. Ask me about crops, irrigation, fertilizer, pests, or salt production.";
    } else {
        answer = "I can provide basic demonstration guidance about crops, irrigation, fertilizer, pests, weather considerations, and salt production. Please mention your crop and describe the problem for more specific guidance.";
    }

    res.json({
        success: true,
        question: question,
        answer: answer,
        source: "FarmerAdvisor demo knowledge base"
    });
});

app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});


app.post("/api/crop-recommendation", (req, res) => {
    const { N, P, K, temperature, humidity, ph, rainfall } = req.body;

    const values = [N, P, K, temperature, humidity, ph, rainfall];

    const valid = values.every(
        value =>
            value !== undefined &&
            value !== null &&
            value !== "" &&
            Number.isFinite(Number(value))
    );

    if (!valid) {
        return res.status(400).json({
            success: false,
            message: "Please provide valid values for all seven inputs."
        });
    }

    const input = {
        N: Number(N),
        P: Number(P),
        K: Number(K),
        temperature: Number(temperature),
        humidity: Number(humidity),
        ph: Number(ph),
        rainfall: Number(rainfall)
    };

    const projectRoot = path.resolve(__dirname, "..");
    const pythonScript = path.join(
        projectRoot,
        "ai",
        "predict_crop.py"
    );
    const pythonExe = path.join(
        projectRoot,
        ".venv",
        "Scripts",
        "python.exe"
    );

    const child = spawn(pythonExe, [
        pythonScript,
        JSON.stringify(input)
    ]);

    let output = "";
    let errorOutput = "";

    child.stdout.on("data", data => {
        output += data.toString();
    });

    child.stderr.on("data", data => {
        errorOutput += data.toString();
    });

    child.on("error", error => {
        console.error("Could not start Python:", error.message);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: "Could not start the Python model."
            });
        }
    });

    child.on("close", code => {
        if (code !== 0) {
            console.error("Python model error:", errorOutput);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: "Crop prediction failed."
                });
            }
            return;
        }

        try {
            const result = JSON.parse(output.trim());
            res.json({
                success: true,
                recommendedCrop: result.recommendedCrop
            });
        } catch (error) {
            console.error("Invalid Python output:", output);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: "Invalid response from Python model."
                });
            }
        }
    });
});
