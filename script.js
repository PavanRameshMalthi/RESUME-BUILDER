const STORAGE_KEY = "resumeBuilderDataV3";
const SAVE_DELAY = 220;

const skillLabels = {
  programming: "Programming Languages",
  frameworks: "Frameworks",
  databases: "Databases",
  tools: "Tools",
  soft: "Soft Skills"
};

const sampleData = {
  theme: "dark",
  template: "professional",
  personal: {
    fullName: "",
    email: "",
    phone: "",
    address: "",
    linkedin: "",
    github: "",
    portfolio: ""
  },
  summary: "",
  education: [
    {
      degree: "",
      college: "",
      university: "",
      startYear: "",
      endYear: "",
      score: ""
    }
  ],
  skills: {
    programming: [],
    frameworks: [],
    databases: [],
    tools: [],
    soft: []
  },
  projects: [
    {
      title: "",
      description: "",
      technologies: "",
      github: "",
      live: ""
    }
  ],
  experience: [
    {
      company: "",
      role: "",
      duration: "",
      responsibilities: ""
    }
  ],
  certifications: [
    {
      name: "",
      organization: "",
      issueDate: "",
      credentialUrl: ""
    }
  ],
  achievements: {
    awards: "",
    hackathons: "",
    competitions: "",
    academic: ""
  }
};

let data = mergeData(sampleData, loadData());
let saveTimer = null;

const form = document.querySelector("#resumeForm");
const preview = document.querySelector("#resumePreview");
const saveStatus = document.querySelector("#saveStatus");
const summaryEditor = document.querySelector("#summaryEditor");
const summaryCount = document.querySelector("#summaryCount");
const templateSelect = document.querySelector("#templateSelect");
const completionBar = document.querySelector("#completionBar");
const completionText = document.querySelector("#completionText");
const toast = document.querySelector("#toast");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeData(base, incoming) {
  const output = clone(base);
  if (!incoming || typeof incoming !== "object") return output;

  Object.keys(incoming).forEach((key) => {
    if (Array.isArray(incoming[key])) {
      output[key] = incoming[key];
    } else if (incoming[key] && typeof incoming[key] === "object" && !Array.isArray(incoming[key])) {
      output[key] = { ...(output[key] || {}), ...incoming[key] };
    } else {
      output[key] = incoming[key];
    }
  });

  return output;
}

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveStatus.textContent = "Saving...";
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      saveStatus.textContent = "Saved";
    } catch (err) {
      saveStatus.textContent = "Save Failed";
    }
  }, SAVE_DELAY);
}

function getValue(path) {
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), data) || "";
}

function setValue(path, value) {
  const parts = path.split(".");
  let target = data;
  parts.slice(0, -1).forEach((part) => {
    target[part] = target[part] || {};
    target = target[part];
  });
  target[parts.at(-1)] = value;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isFilled(value) {
  return String(value || "").trim().length > 0;
}

function plainText(html = "") {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  return wrapper.textContent || wrapper.innerText || "";
}

function sanitizeRichText(html = "") {
  const template = document.createElement("template");
  template.innerHTML = html;
  const allowed = new Set(["B", "STRONG", "I", "EM", "UL", "OL", "LI", "BR", "DIV", "P"]);

  template.content.querySelectorAll("*").forEach((node) => {
    if (!allowed.has(node.tagName)) {
      node.replaceWith(document.createTextNode(node.textContent || ""));
      return;
    }
    [...node.attributes].forEach((attr) => node.removeAttribute(attr.name));
  });

  return template.innerHTML;
}

function formatUrl(url) {
  const clean = String(url || "").trim();
  if (!clean) return "";
  if (/^(https?:|mailto:|tel:)/i.test(clean)) return clean;
  return `https://${clean}`;
}

function link(url, label) {
  const href = formatUrl(url);
  if (!href) return "";
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(label || href.replace(/^https?:\/\//, ""))}</a>`;
}

function splitLines(value = "") {
  return String(value)
    .split(/\n|;/)
    .map((item) => item.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

function listFromText(value) {
  const items = splitLines(value);
  if (!items.length) return "";
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function compact(items) {
  return items.filter((item) => isFilled(item)).join(" | ");
}

function init() {
  document.body.classList.toggle("dark", data.theme === "dark");
  templateSelect.value = data.template;
  summaryEditor.innerHTML = sanitizeRichText(data.summary);
  bindStaticFields();
  renderRepeaters();
  renderSkills();
  setThemeButtons();
  render();
  updateCompletion();
  scheduleSave();
}

function bindStaticFields() {
  document.querySelectorAll("[data-field]").forEach((field) => {
    field.value = getValue(field.dataset.field);
  });
}

function renderRepeaters() {
  renderEducation();
  renderProjects();
  renderExperience();
  renderCertifications();
}

function fieldInput(section, index, key, value, type = "text", placeholder = "") {
  const isArea = type === "textarea";
  const common = `data-section="${section}" data-index="${index}" data-key="${key}" placeholder="${escapeHtml(placeholder)}"`;
  if (isArea) {
    return `<textarea ${common}>${escapeHtml(value)}</textarea>`;
  }
  return `<input type="${type}" value="${escapeHtml(value)}" ${common}>`;
}

function removeButton(section, index) {
  return `<button class="icon-button" type="button" data-remove="${section}" data-index="${index}" aria-label="Remove item">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>
  </button>`;
}

function renderEducation() {
  const container = document.querySelector("#educationList");
  container.innerHTML = data.education.map((item, index) => `
    <div class="repeat-item">
      <div class="repeat-item-header"><span>Education ${index + 1}</span>${removeButton("education", index)}</div>
      <div class="field-grid two">
        <label>Degree ${fieldInput("education", index, "degree", item.degree, "text", "Enter degree")}</label>
        <label>College Name ${fieldInput("education", index, "college", item.college, "text", "Enter college name")}</label>
        <label>University ${fieldInput("education", index, "university", item.university, "text", "Enter university name")}</label>
        <label>CGPA / Percentage ${fieldInput("education", index, "score", item.score, "text", "Enter CGPA / percentage")}</label>
        <label>Start Year ${fieldInput("education", index, "startYear", item.startYear, "text", "Enter start year")}</label>
        <label>End Year ${fieldInput("education", index, "endYear", item.endYear, "text", "Enter end year")}</label>
      </div>
    </div>
  `).join("");
}

function renderProjects() {
  const container = document.querySelector("#projectsList");
  container.innerHTML = data.projects.map((item, index) => `
    <div class="repeat-item">
      <div class="repeat-item-header"><span>Project ${index + 1}</span>${removeButton("projects", index)}</div>
      <div class="field-grid two">
        <label>Project Title ${fieldInput("projects", index, "title", item.title, "text", "Enter project title")}</label>
        <label>Technologies Used ${fieldInput("projects", index, "technologies", item.technologies, "text", "Enter technologies used")}</label>
        <label>GitHub Link ${fieldInput("projects", index, "github", item.github, "url", "Enter GitHub link")}</label>
        <label>Live Demo Link ${fieldInput("projects", index, "live", item.live, "url", "Enter live demo link")}</label>
        <label class="span-two">Description ${fieldInput("projects", index, "description", item.description, "textarea", "Enter project description")}</label>
      </div>
    </div>
  `).join("");
}

function renderExperience() {
  const container = document.querySelector("#experienceList");
  container.innerHTML = data.experience.map((item, index) => `
    <div class="repeat-item">
      <div class="repeat-item-header"><span>Experience ${index + 1}</span>${removeButton("experience", index)}</div>
      <div class="field-grid two">
        <label>Company Name ${fieldInput("experience", index, "company", item.company, "text", "Enter company name")}</label>
        <label>Job Role ${fieldInput("experience", index, "role", item.role, "text", "Enter job role")}</label>
        <label class="span-two">Duration ${fieldInput("experience", index, "duration", item.duration, "text", "Enter duration")}</label>
        <label class="span-two">Responsibilities ${fieldInput("experience", index, "responsibilities", item.responsibilities, "textarea", "Enter responsibilities")}</label>
      </div>
    </div>
  `).join("");
}

function renderCertifications() {
  const container = document.querySelector("#certificationsList");
  container.innerHTML = data.certifications.map((item, index) => `
    <div class="repeat-item">
      <div class="repeat-item-header"><span>Certification ${index + 1}</span>${removeButton("certifications", index)}</div>
      <div class="field-grid two">
        <label>Certificate Name ${fieldInput("certifications", index, "name", item.name, "text", "Enter certificate name")}</label>
        <label>Organization ${fieldInput("certifications", index, "organization", item.organization, "text", "Enter organization")}</label>
        <label>Issue Date ${fieldInput("certifications", index, "issueDate", item.issueDate, "text", "Enter issue date")}</label>
        <label>Credential URL ${fieldInput("certifications", index, "credentialUrl", item.credentialUrl, "url", "Enter credential URL")}</label>
      </div>
    </div>
  `).join("");
}

function renderSkills() {
  const container = document.querySelector("#skillsList");
  container.innerHTML = Object.entries(skillLabels).map(([key, label]) => `
    <div class="repeat-item skill-category">
      <span class="field-label">${label}</span>
      <div class="skill-input-row">
        <input type="text" data-skill-input="${key}" placeholder="Enter ${escapeHtml(label.toLowerCase())}">
        <button class="secondary-button" type="button" data-add-skill="${key}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          Add
        </button>
      </div>
      <div class="skill-tags">
        ${(data.skills[key] || []).map((skill, index) => `
          <span class="skill-tag">${escapeHtml(skill)}
            <button type="button" data-remove-skill="${key}" data-index="${index}" aria-label="Remove ${escapeHtml(skill)}">x</button>
          </span>
        `).join("")}
      </div>
    </div>
  `).join("");
}

function setThemeButtons() {
  document.querySelectorAll(".theme-button").forEach((button) => {
    const active = button.dataset.theme === data.theme;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function headerHtml() {
  const personal = data.personal;
  const contacts = [
    personal.phone,
    personal.email ? link(`mailto:${personal.email}`, personal.email) : "",
    personal.address,
    link(personal.linkedin, "LinkedIn"),
    link(personal.github, "GitHub"),
    link(personal.portfolio, "Portfolio")
  ].filter(Boolean);

  return `
    <header class="resume-header">
      <h1>${escapeHtml(personal.fullName || "Enter Name")}</h1>
      <div class="resume-contact">${contacts.map((item) => `<span>${item}</span>`).join("<span>|</span>")}</div>
    </header>
  `;
}

function section(title, body, extraClass = "") {
  if (!body || !String(body).trim()) return "";
  return `<section class="resume-section ${extraClass}"><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

function summaryHtml(title = "Professional Summary") {
  const body = sanitizeRichText(data.summary);
  return section(title, body || `<p class="empty-hint">Add a short summary to introduce your profile.</p>`);
}

function educationHtml(timeline = false) {
  const entries = data.education
    .filter((item) => isFilled(item.degree) || isFilled(item.college) || isFilled(item.university))
    .map((item) => {
      const place = compact([item.college, item.university]);
      const duration = compact([item.startYear, item.endYear]);
      return `
        <div class="resume-entry ${timeline ? "timeline-entry" : ""}">
          <div class="resume-entry-head">
            <span>${escapeHtml(item.degree || "Degree")}${item.score ? `, ${escapeHtml(item.score)}` : ""}</span>
            <span>${escapeHtml(duration)}</span>
          </div>
          <div class="resume-entry-sub"><span>${escapeHtml(place)}</span></div>
        </div>
      `;
    }).join("");
  return section("Education", entries);
}

function projectHtml() {
  const entries = data.projects
    .filter((item) => isFilled(item.title) || isFilled(item.description))
    .map((item) => {
      const links = compact([link(item.github, "GitHub"), link(item.live, "Live Demo")]);
      return `
        <div class="resume-entry">
          <div class="resume-entry-head">
            <span>${escapeHtml(item.title || "Project Title")}${item.technologies ? ` | ${escapeHtml(item.technologies)}` : ""}</span>
            <span>${links}</span>
          </div>
          ${listFromText(item.description)}
        </div>
      `;
    }).join("");
  return section("Projects", entries);
}

function experienceHtml() {
  const entries = data.experience
    .filter((item) => isFilled(item.company) || isFilled(item.role) || isFilled(item.responsibilities))
    .map((item) => `
      <div class="resume-entry">
        <div class="resume-entry-head">
          <span>${escapeHtml(item.role || "Job Role")}</span>
          <span>${escapeHtml(item.duration || "")}</span>
        </div>
        <div class="resume-entry-sub"><span>${escapeHtml(item.company || "Company Name")}</span></div>
        ${listFromText(item.responsibilities)}
      </div>
    `).join("");
  return section("Experience", entries);
}

function certificationHtml() {
  const entries = data.certifications
    .filter((item) => isFilled(item.name) || isFilled(item.organization))
    .map((item) => `
      <div class="resume-entry">
        <div class="resume-entry-head">
          <span>${escapeHtml(item.name || "Certificate")}</span>
          <span>${escapeHtml(item.issueDate || "")}</span>
        </div>
        <div class="resume-entry-sub">
          <span>${escapeHtml(item.organization || "")}</span>
          <span>${link(item.credentialUrl, "Credential")}</span>
        </div>
      </div>
    `).join("");
  return section("Certifications", entries);
}

function skillsHtml(mode = "plain") {
  const rows = Object.entries(skillLabels)
    .filter(([key]) => (data.skills[key] || []).length)
    .map(([key, label], categoryIndex) => {
      const skills = data.skills[key] || [];
      if (mode === "bars") {
        return skills.slice(0, 8).map((skill, skillIndex) => `
          <div class="skill-bar">
            <strong>${escapeHtml(skill)}</strong>
            <span style="--level: ${Math.max(58, 92 - (categoryIndex + skillIndex) * 5)}%"></span>
          </div>
        `).join("");
      }
      return `<div><strong>${escapeHtml(label)}:</strong> ${escapeHtml(skills.join(", "))}</div>`;
    }).join("");
  return section("Technical Skills", `<div class="resume-skills">${rows}</div>`);
}

function achievementsHtml() {
  const entries = [
    ["Awards", data.achievements.awards],
    ["Hackathons", data.achievements.hackathons],
    ["Competitions", data.achievements.competitions],
    ["Academic Achievements", data.achievements.academic]
  ].filter(([, value]) => isFilled(value)).map(([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`).join("");

  return section("Achievements", entries ? `<ul>${entries}</ul>` : "");
}

function renderProfessional() {
  return [
    headerHtml(),
    summaryHtml("Professional Summary"),
    educationHtml(),
    projectHtml(),
    experienceHtml(),
    certificationHtml(),
    achievementsHtml(),
    skillsHtml()
  ].join("");
}

function renderStudent() {
  return [
    headerHtml(),
    summaryHtml("Career Objective"),
    skillsHtml(),
    educationHtml(true),
    projectHtml(),
    certificationHtml(),
    achievementsHtml()
  ].join("");
}

function renderModern() {
  return `
    <aside class="resume-sidebar-col">
      ${headerHtml()}
      ${skillsHtml("bars")}
      ${certificationHtml()}
    </aside>
    <main class="resume-main-col">
      ${summaryHtml("Profile")}
      ${experienceHtml()}
      ${projectHtml()}
      ${educationHtml()}
      ${achievementsHtml()}
    </main>
  `;
}

function renderMinimal() {
  return [
    headerHtml(),
    summaryHtml("Summary"),
    skillsHtml(),
    experienceHtml(),
    projectHtml(),
    educationHtml(),
    certificationHtml(),
    achievementsHtml()
  ].join("");
}


function renderATS() {
  return [
    headerHtml(),
    summaryHtml("Professional Summary"),
    skillsHtml(),
    experienceHtml(),
    educationHtml(),
    projectHtml(),
    certificationHtml(),
    achievementsHtml()
  ].join("");
}

function renderCreative() {
  return [
    headerHtml(),
    summaryHtml("About Me"),
    experienceHtml(),
    projectHtml(),
    skillsHtml(),
    educationHtml(),
    certificationHtml(),
    achievementsHtml()
  ].join("");
}

function render() {
  const template = data.template || "professional";
  preview.className = `resume-paper ${template}`;
  const renderer = {
    professional: renderProfessional,
    student: renderStudent,
    modern: renderModern,
    minimal: renderMinimal,
    creative: renderCreative,
    ats: renderATS
  }[template] || renderProfessional;

  preview.innerHTML = renderer();
  updateSummaryCount();
}

function updateSummaryCount() {
  summaryCount.textContent = String(plainText(data.summary).length);
}

function updateCompletion() {
  const checks = [
    data.personal.fullName,
    data.personal.email,
    data.personal.phone,
    data.personal.address,
    plainText(data.summary),
    data.education.some((item) => isFilled(item.degree) && isFilled(item.college)),
    Object.values(data.skills).some((items) => items.length),
    data.projects.some((item) => isFilled(item.title)),
    data.experience.some((item) => isFilled(item.company) || isFilled(item.role)),
    data.certifications.some((item) => isFilled(item.name)),
    Object.values(data.achievements).some(isFilled)
  ];
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  completionBar.style.width = `${score}%`;
  completionText.textContent = `${score}%`;
}

function validateField(input) {
  if (!(input instanceof HTMLInputElement)) return true;
  const valid = input.checkValidity();
  input.classList.toggle("invalid", !valid);
  return valid;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function addItem(section) {
  const blank = {
    education: { degree: "", college: "", university: "", startYear: "", endYear: "", score: "" },
    projects: { title: "", description: "", technologies: "", github: "", live: "" },
    experience: { company: "", role: "", duration: "", responsibilities: "" },
    certifications: { name: "", organization: "", issueDate: "", credentialUrl: "" }
  };
  data[section].push({ ...blank[section] });
  renderRepeaters();
  render();
  updateCompletion();
  scheduleSave();
}

function removeItem(section, index) {
  if (!confirm("Delete this item?")) return;
  data[section].splice(Number(index), 1);
  if (!data[section].length) addItem(section);
  renderRepeaters();
  render();
  updateCompletion();
  scheduleSave();
}

form.addEventListener("input", (event) => {
  const target = event.target;

  if (target.matches("[data-field]")) {
    setValue(target.dataset.field, target.value);
    validateField(target);
  }

  if (target.matches("[data-section]")) {
    const { section, index, key } = target.dataset;
    data[section][Number(index)][key] = target.value;
    validateField(target);
  }

  render();
  updateCompletion();
  scheduleSave();
});

form.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add]");
  const remove = event.target.closest("[data-remove]");
  const addSkill = event.target.closest("[data-add-skill]");
  const removeSkill = event.target.closest("[data-remove-skill]");
  const command = event.target.closest("[data-command]");

  if (addButton) addItem(addButton.dataset.add);
  if (remove) removeItem(remove.dataset.remove, remove.dataset.index);

  if (addSkill) {
    const key = addSkill.dataset.addSkill;
    const input = document.querySelector(`[data-skill-input="${key}"]`);
    const value = input.value.trim();
    if (value && !data.skills[key].includes(value)) data.skills[key].push(value);
    input.value = "";
    renderSkills();
    render();
    updateCompletion();
    scheduleSave();
  }

  if (removeSkill) {
    const key = removeSkill.dataset.removeSkill;
    data.skills[key].splice(Number(removeSkill.dataset.index), 1);
    renderSkills();
    render();
    updateCompletion();
    scheduleSave();
  }

  if (command) {
    showToast("Text formatting command executed. Consider upgrading to a modern editor library.");
    summaryEditor.focus();
    data.summary = summaryEditor.innerHTML;
    render();
    scheduleSave();
  }
});

form.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const input = event.target.closest("[data-skill-input]");
  if (!input) return;
  event.preventDefault();
  document.querySelector(`[data-add-skill="${input.dataset.skillInput}"]`).click();
});

summaryEditor.addEventListener("input", () => {
  if (plainText(summaryEditor.innerHTML).length > 700) {
    const selection = window.getSelection();
    summaryEditor.innerHTML = summaryEditor.innerHTML.slice(0, 900);
    selection.collapse(summaryEditor, summaryEditor.childNodes.length);
  }
  data.summary = summaryEditor.innerHTML;
  render();
  updateCompletion();
  scheduleSave();
});

templateSelect.addEventListener("change", () => {
  data.template = templateSelect.value;
  render();
  scheduleSave();
});

document.querySelectorAll(".theme-button").forEach((button) => {
  button.addEventListener("click", () => {
    data.theme = button.dataset.theme;
    document.body.classList.toggle("dark", data.theme === "dark");
    setThemeButtons();
    scheduleSave();
  });
});

// removed legacy print handler

document.querySelector("#previewToggle").addEventListener("click", () => {
  document.body.classList.toggle("preview-only");
});

document.querySelector("#loadSample").addEventListener("click", () => {
  data = clone(sampleData);
  document.body.classList.remove("preview-only");
  init();
  showToast("Sample resume loaded.");
});

document.querySelectorAll(".nav-link").forEach((linkEl) => {
  linkEl.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("active"));
    linkEl.classList.add("active");
  });
});

window.addEventListener("beforeprint", () => {
  document.body.classList.add("printing");
});

window.addEventListener("afterprint", () => {
  document.body.classList.remove("printing");
});

init();



function calculateATSScore(){
 let score=0;
 const missing=[];

 if(data.personal.fullName) score+=10; else missing.push("Full Name");
 if(data.personal.email) score+=10; else missing.push("Email");
 if(data.personal.phone) score+=10; else missing.push("Phone");
 if(plainText(data.summary).length>=100) score+=15; else missing.push("Summary (100+ chars)");
 if(data.education.some(e=>e.degree)) score+=15; else missing.push("Education");
 if(Object.values(data.skills).flat().length>=5) score+=15; else missing.push("At least 5 Skills");
 if(data.projects.some(p=>p.title && p.description)) score+=15; else missing.push("Project with Description");
 if(data.experience.some(e=>e.company||e.role)) score+=10; else missing.push("Experience");

 return {score:Math.min(score,100), missing};
}


const atsBtn=document.querySelector("#atsCheck");
if(atsBtn){
 atsBtn.addEventListener("click",()=>{
   const r=calculateATSScore(); alert(`ATS Score: ${r.score}/100\n\nMissing:\n${r.missing.join("\n")||"Nothing"}`);
 });
}

document.querySelector("#downloadPdf")?.addEventListener("click", async (e)=>{
 e.preventDefault();
 const required=[...document.querySelectorAll("input[required]")];
 const valid=required.every(validateField);
 if(!valid){showToast("Complete required fields."); return;}
 const canvas=await html2canvas(preview,{scale:2});
 const { jsPDF }=window.jspdf;
 const pdf=new jsPDF("p","mm","a4");

 const pageWidth=210;
 const pageHeight=297;

 const imgWidth=pageWidth;
 const imgHeight=(canvas.height*imgWidth)/canvas.width;

 let heightLeft=imgHeight;
 let position=0;

 const imgData=canvas.toDataURL("image/png");

 pdf.addImage(imgData,"PNG",0,position,imgWidth,imgHeight);
 heightLeft-=pageHeight;

 while(heightLeft>0){
   position=heightLeft-imgHeight;
   pdf.addPage();
   pdf.addImage(imgData,"PNG",0,position,imgWidth,imgHeight);
   heightLeft-=pageHeight;
 }

 pdf.save("resume.pdf");
});


document.querySelector("#loadSample")?.addEventListener("click", () => {
data.personal={
fullName:"John Doe",
email:"john.doe@gmail.com",
phone:"+91 9876543210",
address:"Hyderabad, India",
linkedin:"https://linkedin.com/in/johndoe",
github:"https://github.com/johndoe",
portfolio:"https://johndoe.dev"
};

data.summary="Motivated Full Stack Developer skilled in HTML, CSS, JavaScript, React, Node.js and MongoDB with experience building responsive web applications.";

data.education=[{
degree:"B.Tech Computer Science",
college:"ABC Engineering College",
university:"JNTU",
startYear:"2022",
endYear:"2026",
score:"8.5 CGPA"
}];

data.skills={
programming:["JavaScript","Java","Python"],
frameworks:["React","Node.js","Express"],
databases:["MongoDB","MySQL"],
tools:["Git","GitHub","VS Code"],
soft:["Communication","Teamwork"]
};

data.projects=[{
title:"Resume Builder",
description:"Built a responsive resume builder with ATS score checker and PDF export.",
technologies:"HTML, CSS, JavaScript",
github:"https://github.com/johndoe/resume-builder",
live:"https://resume-builder-demo.com"
}];

data.experience=[{
company:"Tech Solutions",
role:"Web Developer Intern",
duration:"Jan 2025 - Mar 2025",
responsibilities:"Developed responsive web pages and fixed UI bugs."
}];

data.certifications=[{
name:"Full Stack Web Development",
organization:"Udemy",
issueDate:"2025-01-15",
credentialUrl:"https://example.com/certificate"
}];

data.achievements={
awards:"Best Student Project Award",
hackathons:"Smart India Hackathon Participant",
competitions:"Coding Contest Finalist",
academic:"Dean's List"
};

init();
showToast("Sample data loaded successfully.");
});

document.addEventListener("input",(e)=>{
const t=e.target;
if(t && t.type==="email"){
const emailPattern=/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;
t.setCustomValidity(emailPattern.test(t.value)||!t.value?"":"Enter a valid email address");
}
});

document.addEventListener("change",(e)=>{
const t=e.target;
if(t.type==="number"){
if(t.value && (Number(t.value)<1950 || Number(t.value)>2100)){
alert("Enter a valid year between 1950 and 2100");
t.value="";
}
}
});
