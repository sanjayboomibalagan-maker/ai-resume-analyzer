// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const analyzeBtn = document.getElementById('analyze-btn');
const processingOverlay = document.getElementById('processing');
const uploadCard = document.querySelector('.upload-card');
const resultsContainer = document.getElementById('results');
let metricsChart = null;
let domainChart = null;

// Skill clusters for categorization
const skillDomains = {
    'Frontend': ['javascript', 'react', 'html', 'css', 'typescript', 'ui/ux', 'design', 'figma', 'flutter', 'react native', 'tailwind'],
    'Backend': ['node.js', 'python', 'java', 'c++', 'ruby', 'php', 'sql', 'nosql', 'mongodb', 'postgresql', 'redis', 'rest api', 'graphql'],
    'DevOps': ['aws', 'docker', 'kubernetes', 'git', 'ci/cd', 'cloud computing', 'cybersecurity'],
    'Data Science': ['machine learning', 'data analysis', 'tensorflow', 'pytorch', 'pandas', 'scikit-learn']
};

const techSkills = Object.values(skillDomains).flat();
let resumeText = "";

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
    analyzeResume(resumeText.toLowerCase());
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
            alert("Resume uploaded successfully! Click 'Analyze Resume' to view results.");
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

function analyzeResume(resume) {
    showProcessing(true);

    setTimeout(() => {
        // Extract skills found in resume
        const resumeSkills = techSkills.filter(skill => resume.includes(skill.toLowerCase()));

        // Skills not found in resume (suggestions to add)
        const missingSkills = techSkills.filter(skill => !resumeSkills.includes(skill));

        // Overall score based on skill coverage
        const matchScore = Math.min(100, Math.round((resumeSkills.length / techSkills.length) * 100 * 2.5));

        // Top suggestions (skills not in resume, limited to 6)
        const suggestions = missingSkills.slice(0, 6);

        // Calculate domain distribution
        const domainStats = {};
        Object.keys(skillDomains).forEach(domain => {
            domainStats[domain] = skillDomains[domain].filter(skill => resume.includes(skill.toLowerCase())).length;
        });

        // Profession Prediction
        const bestDomain = Object.keys(domainStats).reduce((a, b) => domainStats[a] > domainStats[b] ? a : b);
        const predictedProfession = domainStats[bestDomain] > 0 ? `${bestDomain} Specialist` : "Generalist";

        // Advanced Metrics
        const strength = Math.min(100, Math.round((resumeSkills.length * 8) + (resume.length / 400)));
        const atsScore = Math.min(100, Math.round((resumeSkills.length * 6) + 25));

        displayResults(matchScore, resumeSkills, missingSkills.slice(0, 8), suggestions, domainStats, predictedProfession, strength, atsScore);
        showProcessing(false);
    }, 1500);
}

function displayResults(score, detected, missing, suggestions, domainStats, profession, strength, atsScore) {
    uploadCard.classList.add('hidden');
    resultsContainer.classList.remove('hidden');

    // Update Profession
    document.getElementById('recommended-profession').textContent = profession;

    // Render Charts
    renderCharts(strength, atsScore, domainStats);
    const scorePath = document.getElementById('score-path');
    const scoreText = document.getElementById('score-text');
    const scoreFeedback = document.getElementById('score-feedback');

    scorePath.style.strokeDasharray = `${score}, 100`;
    scoreText.textContent = `${score}%`;

    // Dynamic Feedback
    if (score > 85) {
        scoreFeedback.textContent = "Perfect Match! You have most of the required skills for this role.";
        scorePath.style.stroke = "var(--success)";
    } else if (score > 60) {
        scoreFeedback.textContent = "Good Match. Consider highlighting the missing skills if you have them.";
        scorePath.style.stroke = "var(--primary)";
    } else {
        scoreFeedback.textContent = "Low Match. This role requires specific skills not found in your resume.";
        scorePath.style.stroke = "var(--accent)";
    }

    // Detected Skills
    const matchingList = document.getElementById('keywords-list');
    matchingList.innerHTML = detected.map(s => `<span class="tag">${capitalize(s)}</span>`).join('');
    if (detected.length === 0) matchingList.innerHTML = '<p class="text-dim">No recognized skills found.</p>';

    // Skills to Add
    const missingList = document.getElementById('missing-skills-list');
    missingList.innerHTML = missing.map(s => `<span class="tag missing">${capitalize(s)}</span>`).join('');
    if (missing.length === 0) missingList.innerHTML = '<p class="text-dim">Impressive! You cover all major skills.</p>';

    // Suggestions
    const suggestionsList = document.getElementById('suggestions-list');
    suggestionsList.innerHTML = suggestions.map(s => `<span class="tag suggested">${capitalize(s)}</span>`).join('');

    // NLP Summary
    const summaryDiv = document.getElementById('improvement-summary');
    summaryDiv.innerHTML = generateSummary(score, detected, missing);

    // Insights
    const insightsList = document.getElementById('insights-list');
    insightsList.innerHTML = '';
    const insights = generateInsights(score, detected, missing);
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

    // Recommendations
    const recList = document.getElementById('recommendations-list');
    recList.innerHTML = '';
    const recs = generateRecommendations(score, detected, missing, domainStats, strength, atsScore, profession);
    recs.forEach(rec => {
        const li = document.createElement('li');
        li.className = `priority-${rec.priority}`;
        li.innerHTML = `
            <div class="rec-content">
                <strong>${rec.title}</strong>
                <p>${rec.description}</p>
            </div>
            <span class="rec-priority-label ${rec.priority}">${rec.priority}</span>
        `;
        recList.appendChild(li);
    });
}

function generateSummary(score, detected, missing) {
    if (score >= 80) return "Your resume is packed with in-demand skills. Focus on polishing your presentation and interview prep.";
    if (score >= 50) return `Good foundation with ${detected.length} recognized skills. Consider adding ${missing.slice(0, 2).map(s => capitalize(s)).join(', ')} to boost your profile.`;
    return "Your resume has limited technical keywords. We recommend adding more specific skills and technologies relevant to your target role.";
}

function generateInsights(score, detected, missing) {
    const insights = [];
    if (detected.length >= 10) {
        insights.push({ type: 'success', text: `Excellent! ${detected.length} technical skills detected in your resume.` });
    } else if (detected.length >= 5) {
        insights.push({ type: 'success', text: `${detected.length} skills detected — a solid toolkit.` });
    } else {
        insights.push({ type: 'warning', text: `Only ${detected.length} skills detected. Consider listing more technologies you're familiar with.` });
    }

    if (missing.length > 5) {
        insights.push({ type: 'warning', text: `Consider adding trending skills like ${missing.slice(0, 3).map(s => capitalize(s)).join(', ')}.` });
    }

    insights.push({ type: 'success', text: "ATS Tip: Use standard section headings (Experience, Education, Skills) for better parsing." });
    return insights;
}

function generateRecommendations(score, detected, missing, domainStats, strength, atsScore, profession) {
    const recs = [];

    // 1. ATS Score-based recommendations
    if (atsScore < 50) {
        recs.push({
            priority: 'high',
            title: 'Boost Your ATS Compatibility',
            description: 'Your resume may be filtered out by Applicant Tracking Systems. Use standard section titles like "Experience", "Education", and "Skills". Avoid tables, images, and fancy formatting. Stick to a clean, single-column layout.'
        });
    } else if (atsScore < 75) {
        recs.push({
            priority: 'medium',
            title: 'Optimize for ATS Scanners',
            description: 'Your ATS score is decent but can improve. Make sure to list your skills in a dedicated "Skills" or "Technical Skills" section using simple bullet points. Use standard fonts like Arial or Calibri.'
        });
    } else {
        recs.push({
            priority: 'low',
            title: 'ATS Readiness Looks Good',
            description: 'Your resume appears to have strong keyword density. Keep maintaining clear section headers and keyword-rich descriptions to stay ahead.'
        });
    }

    // 2. Skill gaps
    if (missing.length > 5) {
        const topMissing = missing.slice(0, 3).map(s => capitalize(s)).join(', ');
        recs.push({
            priority: 'high',
            title: 'Fill Critical Skill Gaps',
            description: `Your resume is missing several in-demand skills. Prioritize learning and adding: ${topMissing}. Even basic familiarity with these can make a significant difference to recruiters.`
        });
    } else if (missing.length > 0) {
        const topMissing = missing.slice(0, 2).map(s => capitalize(s)).join(', ');
        recs.push({
            priority: 'medium',
            title: 'Consider Adding Trending Skills',
            description: `You could strengthen your profile by adding ${topMissing}. If you have any exposure to these, even through personal projects, list them.`
        });
    }

    // 3. Domain balance
    const domainValues = Object.values(domainStats);
    const maxDomain = Math.max(...domainValues);
    const zeroDomains = Object.entries(domainStats).filter(([_, v]) => v === 0).map(([k]) => k);
    if (zeroDomains.length > 0 && zeroDomains.length < Object.keys(domainStats).length) {
        recs.push({
            priority: 'medium',
            title: `Explore ${zeroDomains[0]} Skills`,
            description: `You have zero skills listed in ${zeroDomains.join(' and ')}. Even basic knowledge here makes you a more versatile candidate. Consider adding relevant coursework or side projects.`
        });
    }

    // 4. Strength-based
    if (strength < 40) {
        recs.push({
            priority: 'high',
            title: 'Add More Technical Content',
            description: 'Your resume appears light on technical detail. Expand your project descriptions with specific technologies used, quantifiable results (e.g., "reduced load time by 40%"), and your individual contributions.'
        });
    } else if (strength < 70) {
        recs.push({
            priority: 'medium',
            title: 'Quantify Your Achievements',
            description: 'Add numbers and metrics to your accomplishments. Instead of "improved performance", write "improved API response time by 60%". Recruiters love measurable impact.'
        });
    }

    // 5. Profession-specific tips
    if (profession.includes('Frontend')) {
        recs.push({
            priority: 'low',
            title: 'Showcase Your Portfolio',
            description: 'As a Frontend specialist, include a link to your portfolio or GitHub. Show live projects with clean UI/UX. Mention responsive design, performance optimization, and component architecture.'
        });
    } else if (profession.includes('Backend')) {
        recs.push({
            priority: 'low',
            title: 'Highlight System Design Skills',
            description: 'Backend roles value scalability knowledge. Mention database optimization, caching strategies, API design patterns, and any microservices experience you have.'
        });
    } else if (profession.includes('DevOps')) {
        recs.push({
            priority: 'low',
            title: 'List Your Infrastructure Toolkit',
            description: 'Emphasize CI/CD pipelines you\'ve built, cloud services you\'ve managed, monitoring tools, and infrastructure-as-code experience (Terraform, Ansible, etc.).'
        });
    } else if (profession.includes('Data')) {
        recs.push({
            priority: 'low',
            title: 'Showcase Data Projects',
            description: 'Highlight datasets you\'ve worked with, models you\'ve built, and their business impact. Mention frameworks like TensorFlow, PyTorch, and visualization tools you use.'
        });
    }

    // 6. General best practices
    recs.push({
        priority: 'low',
        title: 'Keep It Concise & Focused',
        description: 'The ideal resume is 1-2 pages. Remove outdated or irrelevant experiences. Lead each bullet point with strong action verbs: "Architected", "Implemented", "Optimized", "Delivered".'
    });

    if (detected.length > 0 && score < 80) {
        recs.push({
            priority: 'medium',
            title: 'Tailor for Each Application',
            description: 'Customize your resume for each job you apply to. Mirror the exact language from the job description. If they say "React.js", use "React.js" — not just "React".'
        });
    }

    return recs;
}

function renderCharts(strength, ats, domainStats) {
    // Destroy existing charts to avoid overlap
    if (metricsChart) metricsChart.destroy();
    if (domainChart) domainChart.destroy();

    // Metrics Bar Chart
    const ctxMetrics = document.getElementById('metricsChart').getContext('2d');
    metricsChart = new Chart(ctxMetrics, {
        type: 'bar',
        data: {
            labels: ['Strength', 'ATS Score'],
            datasets: [{
                label: 'Percentage',
                data: [strength, ats],
                backgroundColor: ['#8b5cf6', '#06b6d4'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });

    // Domain Pie Chart
    const ctxDomain = document.getElementById('domainChart').getContext('2d');
    domainChart = new Chart(ctxDomain, {
        type: 'doughnut',
        data: {
            labels: Object.keys(domainStats),
            datasets: [{
                data: Object.values(domainStats),
                backgroundColor: ['#8b5cf6', '#06b6d4', '#f43f5e', '#a78bfa'],
                borderWidth: 3,
                borderColor: '#030712'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 20, font: { weight: 'bold' } } }
            },
            cutout: '65%'
        }
    });
}

function capitalize(str) {
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function runDemo() {
    // Sample fictitious resume text (frontend dev)
    const sampleResume = `
        john doe frontend developer javascript react html css git figma ui ux
        built responsive web applications using react and typescript node.js
        experience with rest api graphql postgresql agile scrum
        developed ci/cd pipeline using docker and github actions
        bachelor of science computer science 3 years experience
        worked on e-commerce platform with 100k monthly users
        proficient in python data analysis and machine learning basics
        open source contributor on github cloud computing aws basics
    `.toLowerCase();

    // Sample job description (react developer)
    const sampleJD = `
        we are looking for a react developer with strong javascript and typescript skills
        experience with node.js rest api and graphql required
        familiarity with docker kubernetes and ci/cd pipelines is a plus
        knowledge of aws or cloud computing preferred
        must know git version control and agile development practices
        experience with postgresql or nosql databases is beneficial
        strong communication and ui ux sensibility highly desired
        tensorflow or machine learning experience a bonus
    `.toLowerCase();

    // Show processing animation briefly to simulate real usage
    const uploadCard = document.querySelector('.upload-card');
    const processingOverlay = document.getElementById('processing');

    uploadCard.classList.add('hidden');
    processingOverlay.style.position = 'fixed';
    processingOverlay.style.borderRadius = '0';
    processingOverlay.classList.remove('hidden');

    setTimeout(() => {
        processingOverlay.classList.add('hidden');
        processingOverlay.style.position = '';
        processingOverlay.style.borderRadius = '';

        // Show demo banner
        const demoBanner = document.getElementById('demo-banner');
        demoBanner.classList.remove('hidden');

        analyzeResume(sampleResume);
    }, 1800);
}


function resetAnalyzer() {
    resultsContainer.classList.add('hidden');
    uploadCard.classList.remove('hidden');

    // Hide demo banner on reset
    document.getElementById('demo-banner').classList.add('hidden');

    fileInput.value = '';
    resumeText = '';

    const scorePath = document.getElementById('score-path');
    scorePath.style.strokeDasharray = `0, 100`;
}

document.getElementById('download-report').addEventListener('click', () => {
    alert('Generating comparison report... (Simulation only)');
});
