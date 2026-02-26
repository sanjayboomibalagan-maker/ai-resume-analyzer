// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const jdTextArea = document.getElementById('jd-text');
const analyzeBtn = document.getElementById('analyze-btn');
const processingOverlay = document.getElementById('processing');
const uploadCard = document.querySelector('.upload-card');
const resultsContainer = document.getElementById('results');
const onboardingSection = document.getElementById('onboarding');
const analyzeSection = document.getElementById('analyze');
const startAnalysisBtn = document.getElementById('start-analysis-btn');

let userData = {
    age: null,
    degree: "",
    experience: 0,
    role: ""
};

let resumeText = "";

// Skill keywords for "AI Analysis"
const techSkills = [
    'javascript', 'python', 'react', 'node.js', 'typescript', 'aws', 'docker',
    'kubernetes', 'sql', 'nosql', 'machine learning', 'data analysis',
    'project management', 'agile', 'scrum', 'ui/ux', 'design', 'html', 'css',
    'java', 'c++', 'ruby', 'php', 'swift', 'flutter', 'react native', 'tensorflow',
    'pytorch', 'figma', 'git', 'ci/cd', 'cloud computing', 'cybersecurity',
    'rest api', 'graphql', 'mongodb', 'postgresql', 'redis', 'unity', 'unreal engine'
];

// Event Listeners
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

startAnalysisBtn.addEventListener('click', () => {
    const age = document.getElementById('user-age').value;
    const degree = document.getElementById('user-degree').value.trim();
    const experience = document.getElementById('user-experience').value;
    const role = document.getElementById('user-role').value.trim();

    if (!age || !degree || role === "") {
        alert("Please provide all details (Age, Degree, Experience, and Target Role).");
        return;
    }

    userData.age = age;
    userData.degree = degree;
    userData.experience = parseInt(experience) || 0;
    userData.role = role;

    onboardingSection.classList.add('hidden');
    analyzeSection.classList.remove('hidden');

    // Smooth scroll to analyzer
    analyzeSection.scrollIntoView({ behavior: 'smooth' });
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

analyzeBtn.addEventListener('click', () => {
    if (!resumeText) {
        alert("Please upload a resume first.");
        return;
    }
    const jdText = jdTextArea.value.trim();
    if (!jdText) {
        alert("Please paste a job description for comparison.");
        return;
    }
    analyzeMatch(resumeText.toLowerCase(), jdText.toLowerCase());
});

function handleFile(file) {
    if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file.');
        return;
    }

    showProcessing(true);

    const reader = new FileReader();
    reader.onload = async function () {
        try {
            const typedarray = new Uint8Array(this.result);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let fullText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + ' ';
            }

            resumeText = fullText;
            showProcessing(false);
            alert("Resume uploaded successfully! Now paste the JD and click Analyze.");
        } catch (error) {
            console.error('Error parsing PDF:', error);
            alert('Failed to parse PDF. Please try another file.');
            showProcessing(false);
        }
    };
    reader.readAsArrayBuffer(file);
}

function showProcessing(show) {
    if (show) {
        processingOverlay.classList.remove('hidden');
    } else {
        processingOverlay.classList.add('hidden');
    }
}

function analyzeMatch(resume, jd) {
    showProcessing(true);

    setTimeout(() => {
        // Simple NLP: Keyword Extraction
        const resumeSkills = techSkills.filter(skill => resume.includes(skill.toLowerCase()));
        const jdSkills = techSkills.filter(skill => jd.includes(skill.toLowerCase()));

        // Match Analysis
        const matchingSkills = jdSkills.filter(skill => resumeSkills.includes(skill));
        const missingSkills = jdSkills.filter(skill => !resumeSkills.includes(skill));

        // Calculate Match Percentage
        let matchScore = 0;
        if (jdSkills.length > 0) {
            matchScore = Math.round((matchingSkills.length / jdSkills.length) * 100);
        } else {
            // If no tech keywords in JD, fallback to simple overlap
            matchScore = 50;
        }

        // Suggestions: Skills in techSkills but not in Resume or JD (contextual fillers)
        const suggestions = techSkills
            .filter(skill => !resumeSkills.includes(skill) && !jdSkills.includes(skill))
            .slice(0, 5);

        displayResults(matchScore, matchingSkills, missingSkills, suggestions, resume, jd);
        showProcessing(false);
    }, 1500);
}

function displayResults(score, matching, missing, suggestions, resume, jd) {
    uploadCard.classList.add('hidden');
    resultsContainer.classList.remove('hidden');

    // Update Score Circle
    const scorePath = document.getElementById('score-path');
    const scoreText = document.getElementById('score-text');
    const scoreFeedback = document.getElementById('score-feedback');

    scorePath.style.strokeDasharray = `${score}, 100`;
    scoreText.textContent = `${score}%`;

    // Dynamic Feedback
    if (score > 85) {
        scoreFeedback.textContent = "Perfect Match! You have most of the required skills for this role.";
        scorePath.style.stroke = "#10b981";
    } else if (score > 60) {
        scoreFeedback.textContent = "Good Match. Consider highlighting the missing skills if you have them.";
        scorePath.style.stroke = "#6366f1";
    } else {
        scoreFeedback.textContent = "Low Match. This role requires specific skills not found in your resume.";
        scorePath.style.stroke = "#f59e0b";
    }

    // Matching Skills
    const matchingList = document.getElementById('keywords-list');
    matchingList.innerHTML = matching.map(s => `<span class="tag">${capitalize(s)}</span>`).join('');
    if (matching.length === 0) matchingList.innerHTML = '<p class="text-dim">No matching keywords found.</p>';

    // Missing Skills
    const missingList = document.getElementById('missing-skills-list');
    missingList.innerHTML = missing.map(s => `<span class="tag missing">${capitalize(s)}</span>`).join('');
    if (missing.length === 0) missingList.innerHTML = '<p class="text-dim">None! You hit all the major points.</p>';

    // Suggestions
    const suggestionsList = document.getElementById('suggestions-list');
    suggestionsList.innerHTML = suggestions.map(s => `<span class="tag suggested">${capitalize(s)}</span>`).join('');

    // NLP Summary
    const summaryDiv = document.getElementById('improvement-summary');
    summaryDiv.innerHTML = generateSummary(score, matching, missing);

    // Insights
    const insightsList = document.getElementById('insights-list');
    insightsList.innerHTML = '';
    const insights = generateInsights(score, matching, missing, jd);
    insights.forEach(ins => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="ins-icon ${ins.type === 'success' ? 'ins-success' : 'ins-warning'}">
                ${ins.type === 'success' ? '✓' : '⚠'}
            </span>
            <span>${ins.text}</span>
        `;
        insightsList.appendChild(li);
    });
}

function generateSummary(score, matching, missing) {
    if (score >= 80) return "Your resume is excellent for this position. Focus on behavioral preparation.";
    if (score >= 50) return `You have a solid foundation with ${matching.length} key matches, but missing ${missing.length} critical skills like ${missing.slice(0, 2).join(', ')}.`;
    return "Significant gaps detected. We recommend tailoring your resume specifically to the technical keywords in the job description.";
}

function generateInsights(score, matching, missing, jd) {
    const insights = [];
    if (missing.length > 3) {
        insights.push({ type: 'warning', text: `Missing several core requirements: ${missing.slice(0, 3).join(', ')}.` });
    }
    if (jd.length > 2000) {
        insights.push({ type: 'warning', text: "The JD is very lengthy. Ensure your resume is concise but keyword-rich." });
    }
    if (matching.length > 5) {
        insights.push({ type: 'success', text: "Strong alignment on technical stack." });
    }

    // Personal insights based on onboarding data
    insights.push({ type: 'success', text: `Analyzing for ${userData.role} role with ${userData.experience} years of experience.` });

    if (userData.experience === 0) {
        insights.push({ type: 'warning', text: "As a Fresher, ensure your 'Projects' or 'Internship' section is prominent." });
    } else if (userData.experience > 5 && !resume.includes('leadership') && !resume.includes('managed')) {
        insights.push({ type: 'warning', text: "At your experience level, you should highlight leadership and management skills." });
    }

    if (userData.age < 22 && matching.length < 3) {
        insights.push({ type: 'warning', text: "As a young professional, consider adding more academic projects to bridge the skill gap." });
    }

    insights.push({ type: 'success', text: `Education Check: Your ${userData.degree} aligns well with modern hiring standards.` });
    return insights;
}

function capitalize(str) {
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function resetAnalyzer() {
    resultsContainer.classList.add('hidden');
    analyzeSection.classList.add('hidden');
    onboardingSection.classList.remove('hidden');

    fileInput.value = '';
    jdTextArea.value = '';
    resumeText = "";

    const scorePath = document.getElementById('score-path');
    scorePath.style.strokeDasharray = `0, 100`;
}

document.getElementById('download-report').addEventListener('click', () => {
    alert('Generating comparison report... (Simulation only)');
});
