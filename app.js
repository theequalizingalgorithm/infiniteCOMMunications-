const WORKER_URL = "REPLACE_WITH_CLOUDFLARE_WORKER_URL";

const applicationSection = document.getElementById("application-section");
const applicationForm = document.getElementById("application-form");
const resumeUpload = document.getElementById("resume-upload");
const resumeFileInput = document.getElementById("resume-file-input");
const browseButton = document.getElementById("browse-button");
const dropzoneHint = document.getElementById("dropzone-hint");
const scanSection = document.getElementById("scan-section");
const scanStatus = document.getElementById("scan-status");
const scanProgressFill = document.getElementById("scan-progress-fill");
const reviewSection = document.getElementById("review-section");
const candidateNameInput = document.getElementById("candidate-name");
const candidateEmailInput = document.getElementById("candidate-email");
const careerList = document.getElementById("career-list");
const addCareerEntryButton = document.getElementById("add-career-entry");
const educationList = document.getElementById("education-list");
const addEducationEntryButton = document.getElementById("add-education-entry");
const submitButton = document.getElementById("submit-application");
const submissionStatus = document.getElementById("submission-status");
const checklistItems = document.querySelectorAll(".checklist-item");
const interviewSection = document.getElementById("interview-section");
const interviewHeading = document.getElementById("interview-heading");
const interviewFrame = document.getElementById("jobmojito-interview");

const state = {
  resumeText: "",
  parsedCareer: [],
  parsedEducation: [],
  manualCareer: [],
  manualEducation: [],
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const updateDropzoneHint = (message, error = false) => {
  dropzoneHint.textContent = message;
  dropzoneHint.classList.toggle("error", error);
};

const updateScanStatus = (message) => {
  scanStatus.textContent = message;
};

const setProgress = (percent) => {
  scanProgressFill.style.width = `${percent}%`;
};

const setSubmissionStatus = (message, error = false) => {
  submissionStatus.textContent = message;
  submissionStatus.classList.toggle("error", error);
};

const updateChecklist = (completedStep) => {
  checklistItems.forEach((item) => {
    const step = Number(item.getAttribute("data-step"));
    item.classList.toggle("completed", step <= completedStep);
  });
};

const isSupportedFile = (file) => {
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ];
  return (
    allowedTypes.includes(file.type) ||
    file.name.toLowerCase().endsWith(".pdf") ||
    file.name.toLowerCase().endsWith(".docx")
  );
};

const showElement = (element) => element.classList.remove("hidden");
const hideElement = (element) => element.classList.add("hidden");

resumeUpload.addEventListener("dragover", (event) => {
  event.preventDefault();
  resumeUpload.classList.add("drag-over");
});

resumeUpload.addEventListener("dragleave", () => {
  resumeUpload.classList.remove("drag-over");
});

resumeUpload.addEventListener("drop", async (event) => {
  event.preventDefault();
  resumeUpload.classList.remove("drag-over");
  const [file] = Array.from(event.dataTransfer.files || []);
  if (file) {
    await handleFile(file);
  }
});

resumeUpload.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    resumeFileInput.click();
  }
});

browseButton.addEventListener("click", () => resumeFileInput.click());

resumeFileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (file) {
    await handleFile(file);
  }
});

const loadPdfJs = async () => {
  if (window.pdfjsLib) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.122/pdf.min.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const loadMammoth = async () => {
  if (window.mammoth) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.4.21/mammoth.browser.min.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const handleFile = async (file) => {
  if (!isSupportedFile(file)) {
    updateDropzoneHint("Only PDF and DOCX resume files are supported.", true);
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    updateDropzoneHint("Please use a resume file smaller than 10 MB.", true);
    return;
  }

  updateDropzoneHint("");
  hideElement(reviewSection);
  showElement(scanSection);
  setProgress(0);
  updateChecklist(1);
  await runScanSequence();

  try {
    let extractedText = "";
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      await loadPdfJs();
      extractedText = await extractTextFromPdf(file);
    } else {
      await loadMammoth();
      extractedText = await extractTextFromDocx(file);
    }

    state.resumeText = extractedText.trim();

    if (!state.resumeText) {
      updateScanStatus("Upload complete — no extractable text found.");
      await delay(600);
      analyzeResumeText("");
      ensureManualEntriesAvailable();
      showReviewInterface();
      return;
    }

    analyzeResumeText(state.resumeText);
    ensureManualEntriesAvailable();
    showReviewInterface();
  } catch (error) {
    updateScanStatus("Unable to parse the resume file.");
    await delay(600);
    analyzeResumeText("");
    ensureManualEntriesAvailable();
    showReviewInterface();
  }
};

const runScanSequence = async () => {
  const messages = [
    "Upload complete",
    "Identifying candidate information",
    "Parsing employment history",
    "Reviewing education",
    "Preparing application profile",
  ];

  for (let index = 0; index < messages.length; index += 1) {
    updateScanStatus(messages[index]);
    setProgress(((index + 1) / messages.length) * 100);
    await delay(600);
  }
};

const arrayBufferToText = async (file) => {
  const buffer = await file.arrayBuffer();
  return buffer;
};

const extractTextFromPdf = async (file) => {
  const arrayBuffer = await arrayBufferToText(file);
  const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
  const document = await loadingTask.promise;
  const pageCount = Math.min(document.numPages, 8);
  const pageTexts = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    pageTexts.push(pageText);
  }

  return pageTexts.join("\n\n");
};

const extractTextFromDocx = async (file) => {
  const arrayBuffer = await arrayBufferToText(file);
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return result.value || "";
};

const analyzeResumeText = (text) => {
  const normalizedText = text.replace(/\r/g, "");
  const lines = normalizedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  candidateNameInput.value = extractName(lines);
  candidateEmailInput.value = extractEmail(normalizedText) || "";

  state.parsedCareer = extractCareerEntries(lines);
  state.parsedEducation = extractEducationEntries(lines);
  state.manualCareer = [];
  state.manualEducation = [];
};

const ensureManualEntriesAvailable = () => {
  if (!state.parsedCareer.length && !state.manualCareer.length) {
    state.manualCareer.push({ title: "", term: "", description: "" });
  }

  if (!state.parsedEducation.length && !state.manualEducation.length) {
    state.manualEducation.push({ title: "", term: "", description: "" });
  }
};

const extractName = (lines) => {
  const nameRegex = /^[A-Z][a-z]+(?: [A-Z][a-z]+){0,4}$/;
  for (let i = 0; i < Math.min(lines.length, 12); i += 1) {
    const candidate = lines[i];
    if (candidate.split(" ").length >= 2 && candidate.split(" ").length <= 5 && nameRegex.test(candidate)) {
      return candidate;
    }
  }
  return "";
};

const extractEmail = (text) => {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : "";
};

const extractCareerEntries = (lines) => {
  const jobTitlePattern = /^(Senior|Junior|Lead|Head|Assistant|Coordinator|Manager|Specialist|Analyst|Administrator|Consultant|Developer|Engineer|Designer|Representative|Executive)\b/i;
  const termPattern = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})/i;
  const entries = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (jobTitlePattern.test(line) || termPattern.test(line)) {
      let title = line;
      let term = "";
      const descriptionLines = [];

      for (let offset = index + 1; offset < Math.min(index + 6, lines.length); offset += 1) {
        const nextLine = lines[offset];
        if (!term && termPattern.test(nextLine)) {
          term = nextLine;
          continue;
        }
        if (!jobTitlePattern.test(nextLine) && !termPattern.test(nextLine)) {
          descriptionLines.push(nextLine);
        }
        if (descriptionLines.length >= 3) break;
      }

      if (!term) {
        const previousLine = lines[index - 1];
        if (previousLine && !jobTitlePattern.test(previousLine)) {
          term = line;
          title = previousLine;
        }
      }

      if (title && term) {
        entries.push({
          title: title.slice(0, 140),
          description: descriptionLines.join(" ").slice(0, 460) || "No description available.",
          term: term.slice(0, 90),
        });
      }
    }
    if (entries.length >= 6) break;
  }

  if (entries.length < 2) {
    return [];
  }

  const modified = entries.slice(0);
  const removed = modified.splice(1, 1)[0];
  const first = modified[0];
  modified[0] = {
    title: removed.title,
    term: removed.term,
    description: first.description,
  };
  return modified;
};

const extractEducationEntries = (lines) => {
  const educationPattern = /(Bachelor|Master|Associate|Diploma|Certificate|High School|GED|MBA|BA|BS|MA|MS)/i;
  const entries = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (educationPattern.test(line)) {
      let title = line;
      let term = "";
      const descriptionLines = [];

      for (let offset = index + 1; offset < Math.min(index + 5, lines.length); offset += 1) {
        const nextLine = lines[offset];
        if (!term && /\d{4}/.test(nextLine)) {
          term = nextLine;
          continue;
        }
        descriptionLines.push(nextLine);
        if (descriptionLines.length >= 3) break;
      }

      entries.push({
        title: title.slice(0, 140),
        description: descriptionLines.join(" ").slice(0, 460) || "Education record found.",
        term: term.slice(0, 90),
      });
    }
    if (entries.length >= 4) break;
  }

  return entries;
};

const showReviewInterface = () => {
  hideElement(scanSection);
  showElement(reviewSection);
  renderCareerEntries();
  renderEducationEntries();
  updateChecklist(2);
};

const createReadOnlyCard = (title, term, description) => {
  const card = document.createElement("article");
  card.className = "entry-card readonly-entry";

  const titleElement = document.createElement("strong");
  titleElement.textContent = title;

  const termElement = document.createElement("p");
  termElement.textContent = term;
  termElement.style.fontStyle = "italic";

  const descriptionElement = document.createElement("p");
  descriptionElement.textContent = description;

  card.appendChild(titleElement);
  card.appendChild(termElement);
  card.appendChild(descriptionElement);
  return card;
};

const createEditableEntry = (entry, onChange, onDelete) => {
  const card = document.createElement("article");
  card.className = "entry-card editable-entry";

  const titleGroup = document.createElement("div");
  titleGroup.className = "field-group";
  const titleLabel = document.createElement("label");
  titleLabel.textContent = entry.title ? "Job Title" : "Title";
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.value = entry.title;
  titleInput.required = true;
  titleInput.addEventListener("input", () => {
    onChange({ ...entry, title: titleInput.value });
  });
  titleGroup.appendChild(titleLabel);
  titleGroup.appendChild(titleInput);

  const termGroup = document.createElement("div");
  termGroup.className = "field-group";
  const termLabel = document.createElement("label");
  termLabel.textContent = "Term";
  const termInput = document.createElement("input");
  termInput.type = "text";
  termInput.value = entry.term;
  termInput.addEventListener("input", () => {
    onChange({ ...entry, term: termInput.value });
  });
  termGroup.appendChild(termLabel);
  termGroup.appendChild(termInput);

  const descriptionGroup = document.createElement("div");
  descriptionGroup.className = "field-group";
  const descriptionLabel = document.createElement("label");
  descriptionLabel.textContent = entry.description ? "Description" : "Description";
  const descriptionInput = document.createElement("textarea");
  descriptionInput.value = entry.description;
  descriptionInput.addEventListener("input", () => {
    onChange({ ...entry, description: descriptionInput.value });
  });
  descriptionGroup.appendChild(descriptionLabel);
  descriptionGroup.appendChild(descriptionInput);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "secondary-button";
  deleteButton.textContent = "Remove entry";
  deleteButton.addEventListener("click", onDelete);

  card.appendChild(titleGroup);
  card.appendChild(termGroup);
  card.appendChild(descriptionGroup);
  card.appendChild(deleteButton);
  return card;
};

const renderCareerEntries = () => {
  careerList.innerHTML = "";
  const allEntries = [...state.parsedCareer, ...state.manualCareer];

  if (!allEntries.length) {
    careerList.innerHTML = "<p class='section-note'>No career history parsed yet. Add or correct entries below.</p>";
  }

  allEntries.forEach((entry, index) => {
    const isParsed = index < state.parsedCareer.length;
    const card = createEditableEntry(
      entry,
      (updated) => {
        if (isParsed) {
          state.parsedCareer[index] = updated;
        } else {
          state.manualCareer[index - state.parsedCareer.length] = updated;
        }
      },
      () => {
        if (isParsed) {
          state.parsedCareer.splice(index, 1);
        } else {
          state.manualCareer.splice(index - state.parsedCareer.length, 1);
        }
        renderCareerEntries();
      }
    );
    careerList.appendChild(card);
  });
};

const renderEducationEntries = () => {
  educationList.innerHTML = "";
  const allEntries = [...state.parsedEducation, ...state.manualEducation];

  if (!allEntries.length) {
    educationList.innerHTML = "<p class='section-note'>No education history parsed yet. Add or correct entries below.</p>";
  }

  allEntries.forEach((entry, index) => {
    const isParsed = index < state.parsedEducation.length;
    const card = createEditableEntry(
      entry,
      (updated) => {
        if (isParsed) {
          state.parsedEducation[index] = updated;
        } else {
          state.manualEducation[index - state.parsedEducation.length] = updated;
        }
      },
      () => {
        if (isParsed) {
          state.parsedEducation.splice(index, 1);
        } else {
          state.manualEducation.splice(index - state.parsedEducation.length, 1);
        }
        renderEducationEntries();
      }
    );
    educationList.appendChild(card);
  });
};

addCareerEntryButton.addEventListener("click", (event) => {
  event.preventDefault();
  state.manualCareer.push({ title: "", term: "", description: "" });
  renderCareerEntries();
});

addEducationEntryButton.addEventListener("click", (event) => {
  event.preventDefault();
  state.manualEducation.push({ title: "", term: "", description: "" });
  renderEducationEntries();
});

applicationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setSubmissionStatus("");

  const fullName = candidateNameInput.value.trim();
  const email = candidateEmailInput.value.trim();

  if (!fullName || !email) {
    setSubmissionStatus("Full Name and Email Address are required.", true);
    return;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    setSubmissionStatus("Please enter a valid email address.", true);
    return;
  }

  submitButton.disabled = true;
  setSubmissionStatus("Preparing your interview…");

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: fullName, email }),
    });

    const data = await response.json();
    if (!response.ok || !data.embedUrl) {
      throw new Error(data.error || "Unable to start the interview.");
    }

    interviewFrame.src = data.embedUrl;
    applicationSection.hidden = true;
    interviewSection.hidden = false;
    interviewHeading.focus();
    interviewSection.scrollIntoView({ behavior: "smooth", block: "start" });
    updateChecklist(3);
  } catch (error) {
    setSubmissionStatus(error.message, true);
    submitButton.disabled = false;
  }
});

candidateNameInput.addEventListener("input", () => setSubmissionStatus(""));
candidateEmailInput.addEventListener("input", () => setSubmissionStatus(""));

const initialize = () => {
  hideElement(reviewSection);
  hideElement(interviewSection);
  hideElement(scanSection);
  updateDropzoneHint("No file selected.");
};

initialize();
