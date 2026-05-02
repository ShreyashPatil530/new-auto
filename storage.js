const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const STORAGE_FILE = path.join(__dirname, "sent_jobs.json");
const MONGODB_URI = process.env.MONGODB_URI;

// Define MongoDB Schema
const JobSchema = new mongoose.Schema({
    jobId: { type: String, unique: true, index: true },
    title: String,
    company: String,
    notifiedAt: { type: Date, default: Date.now },
});

let JobModel;
try {
    JobModel = mongoose.model("Job") || mongoose.model("Job", JobSchema);
} catch (e) {
    JobModel = mongoose.model("Job", JobSchema);
}

/**
 * Initializes Database Connection
 */
async function initStorage() {
    if (MONGODB_URI) {
        try {
            if (mongoose.connection.readyState === 0) {
                await mongoose.connect(MONGODB_URI);
                console.log("🟢 Connected to MongoDB (Persistent Database)");
            }
        } catch (error) {
            console.error("🔴 MongoDB Connection Failed:", error.message);
            console.log("ℹ️ Falling back to Local JSON Storage.");
        }
    } else {
        console.log("ℹ️ MONGODB_URI not found. Using Local JSON Storage.");
    }
}

/**
 * Filters jobs to find those that haven't been sent.
 */
async function filterSentJobs(jobs) {
    if (mongoose.connection.readyState === 1 && JobModel) {
        const jobIds = jobs.map((j) => j.id);
        const existingJobs = await JobModel.find({ jobId: { $in: jobIds } }).select("jobId");
        const existingIds = existingJobs.map((j) => j.jobId);
        return jobs.filter((job) => !existingIds.includes(job.id));
    } else {
        // Fallback to local JSON
        const data = fs.existsSync(STORAGE_FILE) ? fs.readFileSync(STORAGE_FILE, "utf8") : "[]";
        let sentIds = [];
        try {
            sentIds = JSON.parse(data);
        } catch (e) {
            sentIds = [];
        }
        return jobs.filter((job) => !sentIds.includes(job.id));
    }
}

/**
 * Marks jobs as sent in the database.
 */
async function saveSentJobs(jobList) {
    if (mongoose.connection.readyState === 1 && JobModel) {
        const ops = jobList.map((job) => ({
            updateOne: {
                filter: { jobId: job.id },
                update: {
                    $set: {
                        jobId: job.id,
                        title: job.title,
                        company: job.company,
                        notifiedAt: new Date(),
                    },
                },
                upsert: true,
            },
        }));
        await JobModel.bulkWrite(ops);
        console.log(`- Synced ${jobList.length} jobs to MongoDB Cluster.`);
    } else {
        // Fallback to local JSON
        const data = fs.existsSync(STORAGE_FILE) ? fs.readFileSync(STORAGE_FILE, "utf8") : "[]";
        let sentIds = [];
        try {
            sentIds = JSON.parse(data);
        } catch (e) {
            sentIds = [];
        }

        const newIds = jobList.map((j) => j.id);
        const updatedIds = [...new Set([...sentIds, ...newIds])].slice(-500);
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(updatedIds, null, 2));
        console.log(`- Updated Local JSON Log (${updatedIds.length} entries).`);
    }
}

module.exports = { initStorage, saveSentJobs, filterSentJobs };

