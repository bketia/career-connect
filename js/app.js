// =====================================
// CAREERCONNECT - JAVASCRIPT
// =====================================

// 1. API and cache settings

const API_URL = "https://proxy.cors.dev/https://jobseveryhour.com/api/v1/latest.json";
const CACHE_KEY = "careerConnectJobs";
const CACHE_DURATION = 60 * 60 * 1000; // One hour

// 2. Get elements from the HTML page

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const locationFilter = document.getElementById("locationFilter");
const categoryFilter = document.getElementById("categoryFilter");
const sortFilter = document.getElementById("sortFilter");
const jobList = document.getElementById("jobList");
const savedJobsList = document.getElementById("savedJobsList");

// Store the jobs retrieved from the API
let allJobs = [];

// Read saved jobs safely from the browser
function getSavedJobs() {
    try {
        return JSON.parse(localStorage.getItem("savedJobs")) || [];
    } catch {
        return [];
    }
}

// 3. Load jobs from the API

async function loadJobs() {
    jobList.textContent = "Loading job opportunities...";

    try {
        // Check whether recently retrieved jobs are saved
        const savedData = localStorage.getItem(CACHE_KEY);

        if (savedData) {
            const cached = JSON.parse(savedData);

            const cacheIsValid =
                cached.savedAt &&
                Date.now() - cached.savedAt < CACHE_DURATION &&
                Array.isArray(cached.jobs);

            if (cacheIsValid) {
                allJobs = cached.jobs;
                fillCategoryFilter();
                displayJobs();
                return;
            }
        }

        // Request fresh job data
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("The job service is currently unavailable.");
        }

        const data = await response.json();

        if (!data || !Array.isArray(data.jobs)) {
            throw new Error("The API returned an unexpected response.");
        }

        allJobs = data.jobs;

        // Save the results so we do not request the API too often
        localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
                savedAt: Date.now(),
                jobs: allJobs
            })
        );

        fillCategoryFilter();
        displayJobs();

    } catch (error) {
        console.error("Job loading error:", error);

        // If the API fails, try using previously saved jobs
        try {
            const savedData = localStorage.getItem(CACHE_KEY);

            if (savedData) {
                const cached = JSON.parse(savedData);

                if (Array.isArray(cached.jobs) && cached.jobs.length > 0) {
                    allJobs = cached.jobs;
                    fillCategoryFilter();
                    displayJobs();
                    return;
                }
            }
        } catch (cacheError) {
            console.error("Cache error:", cacheError);
        }

        document.getElementById("jobCount").textContent = "";
        jobList.textContent =
            "Sorry, we could not load job opportunities. Please try again later.";
    }
}

// 4. Fill the category filter with the categories found in the jobs

function fillCategoryFilter() {
    const categories = [...new Set(
        allJobs
            .map((job) => (job.category || "").trim())
            .filter((category) => category !== "")
    )].sort();

    // Keep the "All Categories" option and remove the rest
    categoryFilter.length = 1;

    categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

// 5. Display job opportunities

function displayJobs() {
    jobList.replaceChildren();

    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedLocation = locationFilter.value;
    const selectedCategory = categoryFilter.value;
    const selectedSort = sortFilter.value;

    // Search and filter the jobs
    let filteredJobs = allJobs.filter((job) => {
        const title = (job.title || "").toLowerCase();
        const company = (job.company || "").toLowerCase();
        const location = (job.location || "").toLowerCase();

        const matchesSearch =
            title.includes(searchTerm) ||
            company.includes(searchTerm) ||
            location.includes(searchTerm);

        const isRemote =
            job.remote === true || location.includes("remote");

        const isRwanda = location.includes("rwanda");

        const matchesLocation =
            selectedLocation === "all" ||
            (selectedLocation === "rwanda" && isRwanda) ||
            (selectedLocation === "remote" && isRemote) ||
            (selectedLocation === "international" &&
                !isRwanda &&
                !isRemote);

        const matchesCategory =
            selectedCategory === "all" ||
            (job.category || "") === selectedCategory;

        return matchesSearch && matchesLocation && matchesCategory;
    });

    // Sort the results
    if (selectedSort === "newest") {
        filteredJobs.sort((a, b) =>
            new Date(b.posted || 0) - new Date(a.posted || 0)
        );
    } else if (selectedSort === "company") {
        filteredJobs.sort((a, b) =>
            (a.company || "").localeCompare(b.company || "")
        );
    }

    document.getElementById("jobCount").textContent =
        `${filteredJobs.length} job opportunities found`;

    // Show a message if no jobs match
    if (filteredJobs.length === 0) {
        jobList.textContent =
            "No jobs found. Try changing your search or filters.";
        return;
    }

    // Create a card for each job
    filteredJobs.forEach((job) => {
        const card = document.createElement("article");
        card.className = "job-card";

        const title = document.createElement("h3");
        title.textContent = job.title || "Untitled position";

        const company = document.createElement("p");
        company.className = "job-company";
        company.textContent = job.company || "Company not provided";

        const category = document.createElement("p");
        category.textContent = "Category: " + (job.category || "Not specified");

        const location = document.createElement("p");
        location.textContent =
            "Location: " + (job.location || "Not specified") +
            (job.remote === true ? " (Remote)" : "");

        const salary = document.createElement("p");
        salary.textContent = "Salary: " + (job.salary || "Not specified");

        const posted = document.createElement("p");
        posted.textContent = "Posted: " + (job.posted || "Date not provided");

        const source = document.createElement("a");
        source.textContent = "View original job listing";

        // Only allow secure HTTPS links
        try {
            const jobURL = new URL(job.url);

            if (jobURL.protocol === "https:") {
                source.href = jobURL.href;
                source.target = "_blank";
                source.rel = "noopener noreferrer";
            } else {
                source.textContent = "Application link unavailable";
            }
        } catch {
            source.textContent = "Application link unavailable";
        }

        // Create a Save Job button
        const saveButton = document.createElement("button");
        saveButton.textContent = "Save Job";
        saveButton.className = "save-button";

        // Check whether this job is already saved
        if (getSavedJobs().some((savedJob) => savedJob.url === job.url)) {
            saveButton.textContent = "Saved";
        }

        // Save or remove the job when the button is clicked
        saveButton.addEventListener("click", () => {
            let savedJobs = getSavedJobs();

            const alreadySaved = savedJobs.some(
                (savedJob) => savedJob.url === job.url
            );

            if (alreadySaved) {
                savedJobs = savedJobs.filter(
                    (savedJob) => savedJob.url !== job.url
                );
                saveButton.textContent = "Save Job";
            } else {
                savedJobs.push(job);
                saveButton.textContent = "Saved";
            }

            localStorage.setItem("savedJobs", JSON.stringify(savedJobs));
            displaySavedJobs();
        });

        card.append(
            title,
            company,
            category,
            location,
            salary,
            posted,
            source,
            saveButton
        );

        jobList.appendChild(card);
    });
}

// 6. Connect search and filters

searchButton.addEventListener("click", displayJobs);

searchInput.addEventListener("input", displayJobs);

locationFilter.addEventListener("change", displayJobs);

categoryFilter.addEventListener("change", displayJobs);

sortFilter.addEventListener("change", displayJobs);

// 7. Display saved jobs

function displaySavedJobs() {
    savedJobsList.replaceChildren();

    const savedJobs = getSavedJobs();

    if (savedJobs.length === 0) {
        savedJobsList.textContent = "You haven't saved any jobs yet.";
        return;
    }

    savedJobs.forEach((job) => {
        const card = document.createElement("article");
        card.className = "job-card";

        const title = document.createElement("h3");
        title.textContent = job.title || "Untitled position";

        const company = document.createElement("p");
        company.className = "job-company";
        company.textContent = job.company || "Company not provided";

        const location = document.createElement("p");
        location.textContent = "Location: " + (job.location || "Not specified");

        const removeButton = document.createElement("button");
        removeButton.textContent = "Remove";
        removeButton.className = "save-button";

        removeButton.addEventListener("click", () => {
            const updatedJobs = savedJobs.filter(
                (savedJob) => savedJob.url !== job.url
            );

            localStorage.setItem("savedJobs", JSON.stringify(updatedJobs));
            displaySavedJobs();
            displayJobs();
        });

        card.append(title, company, location, removeButton);
        savedJobsList.appendChild(card);
    });
}

// 8. Start the application

loadJobs();
displaySavedJobs();