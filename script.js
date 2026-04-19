// =============================================
// CONFIGURATION — Paste your Google Apps Script
// Web App URL below after deploying
// =============================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxuU6n4cOxJBHFFOYONBlkAgOHNXthpQToas6R7LyTEX1ES58RzDP-QmV1KAhtE340/exec"
// =============================================
// STEP NAVIGATION
// =============================================
let currentStep = 1;
const totalSteps = 4;

function goToStep(step) {
  if (step > currentStep && !validateStep(currentStep)) return;

  document.getElementById(`step${currentStep}`).classList.remove("active");
  document.getElementById(`step${step}`).classList.add("active");
  currentStep = step;

  updateProgress();
  if (step === 4) buildSummary();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateProgress() {
  const fill = document.getElementById("progressFill");
  fill.style.width = (currentStep / totalSteps * 100) + "%";

  document.querySelectorAll(".prog-label").forEach(el => {
    el.classList.toggle("active", parseInt(el.dataset.step) <= currentStep);
  });
}

// =============================================
// VALIDATION
// =============================================
function validateStep(step) {
  let valid = true;

  const rules = {
    1: [
      { id: "name",  errId: "nameErr",  msg: "Full name is required." },
      { id: "email", errId: "emailErr", msg: "Valid email is required.", pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      { id: "phone", errId: "phoneErr", msg: "Phone number is required." },
    ],
    2: [
      { id: "position", errId: "positionErr", msg: "Position is required." },
    ]
  };

  if (rules[step]) {
    rules[step].forEach(rule => {
      const el = document.getElementById(rule.id);
      const err = document.getElementById(rule.errId);
      const val = el.value.trim();
      const failed = !val || (rule.pattern && !rule.pattern.test(val));
      el.classList.toggle("invalid", failed);
      err.textContent = failed ? rule.msg : "";
      if (failed) valid = false;
    });
  }

  return valid;
}

// Clear error on input
["name","email","phone","position"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", () => {
    el.classList.remove("invalid");
    const errEl = document.getElementById(id + "Err");
    if (errEl) errEl.textContent = "";
  });
});

// =============================================
// SKILLS TAG INPUT
// =============================================
let skillsList = [];

document.getElementById("skillInput").addEventListener("keydown", function(e) {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    const val = this.value.trim().replace(/,+$/, "");
    if (val && !skillsList.includes(val)) {
      skillsList.push(val);
      renderSkills();
    }
    this.value = "";
  }
});

function renderSkills() {
  const container = document.getElementById("skillsTags");
  container.innerHTML = skillsList.map((s, i) => `
    <span class="skill-tag">
      ${s}
      <button type="button" onclick="removeSkill(${i})">×</button>
    </span>
  `).join("");
  document.getElementById("skills").value = skillsList.join(", ");
}

function removeSkill(index) {
  skillsList.splice(index, 1);
  renderSkills();
}

// =============================================
// INTERVIEW STATUS BUTTONS
// =============================================
function setStatus(btn, hiddenId) {
  btn.closest(".status-buttons").querySelectorAll(".status-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(hiddenId).value = btn.dataset.value;
}

// =============================================
// TOGGLE SWITCHES
// =============================================
function setupToggle(checkboxId, textId, hiddenId, onText, offText) {
  const chk = document.getElementById(checkboxId);
  const txt = document.getElementById(textId);
  const hid = document.getElementById(hiddenId);
  chk.addEventListener("change", () => {
    txt.textContent = chk.checked ? onText : offText;
    hid.value = chk.checked ? "Yes" : "No";
  });
}

setupToggle("offerSentToggle", "offerSentText", "offerSent", "Sent ✓", "Not Sent");
setupToggle("selectedToggle",  "selectedText",  "selected",  "Yes ✓",  "No");

// =============================================
// SAME ADDRESS CHECKBOX
// =============================================
document.getElementById("sameAddress").addEventListener("change", function() {
  const perm = document.getElementById("permanentAddress");
  if (this.checked) {
    perm.value = document.getElementById("currentAddress").value;
    perm.setAttribute("readonly", true);
    perm.style.background = "#f1f5f9";
  } else {
    perm.removeAttribute("readonly");
    perm.style.background = "";
  }
});

document.getElementById("currentAddress").addEventListener("input", function() {
  if (document.getElementById("sameAddress").checked) {
    document.getElementById("permanentAddress").value = this.value;
  }
});

// =============================================
// SUMMARY BUILDER
// =============================================
function buildSummary() {
  const fields = [
    ["Name", "name"],
    ["Email", "email"],
    ["Phone", "phone"],
    ["Position", "position"],
    ["Department", "department"],
    ["Experience", "experience", "yrs"],
    ["Interview Status", "interviewStatus"],
    ["Interview Round", "interviewRound"],
    ["Offer Sent", "offerSent"],
    ["Employment Type", "employmentType"],
    ["Work Location", "workLocation"],
    ["Salary", "salary"],
  ];

  const grid = document.getElementById("summaryGrid");
  grid.innerHTML = fields.map(([label, id, suffix]) => {
    const val = document.getElementById(id)?.value || "—";
    return `<div class="summary-item">
      <div class="s-label">${label}</div>
      <div class="s-val">${val || "—"}${val && suffix ? " " + suffix : ""}</div>
    </div>`;
  }).join("");
}

// =============================================
// FORM SUBMIT — SAVE TO GOOGLE SHEETS
// =============================================
document.getElementById("hrForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  if (!validateStep(currentStep)) return;

  const btnText   = document.getElementById("btnText");
  const btnLoader = document.getElementById("btnLoader");
  const submitBtn = document.getElementById("submitBtn");

  btnText.classList.add("hidden");
  btnLoader.classList.remove("hidden");
  submitBtn.disabled = true;

  const data = {
    timestamp:        new Date().toLocaleString("en-IN"),
    name:             getValue("name"),
    email:            getValue("email"),
    phone:            getValue("phone"),
    gender:           getValue("gender"),
    dob:              getValue("dob"),
    currentAddress:   getValue("currentAddress"),
    permanentAddress: getValue("permanentAddress"),
    position:         getValue("position"),
    department:       getValue("department"),
    skills:           getValue("skills"),
    experience:       getValue("experience"),
    resume:           getValue("resume"),
    applicationDate:  getValue("applicationDate"),
    interviewStatus:  getValue("interviewStatus"),
    interviewRound:   getValue("interviewRound"),
    selected:         getValue("selected"),
    remarks:          getValue("remarks"),
    offerSent:        getValue("offerSent"),
    joiningDate:      getValue("joiningDate"),
    employmentType:   getValue("employmentType"),
    workLocation:     getValue("workLocation"),
    salary:           getValue("salary"),
  };

  try {
    const response = await fetch(SCRIPT_URL, {
      method:  "POST",
      mode:    "no-cors",           // Required for Google Apps Script
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });

    showToast("🎉 Employee saved to Google Sheets!");
    document.getElementById("hrForm").reset();
    skillsList = [];
    renderSkills();
    document.getElementById("offerSentText").textContent = "Not Sent";
    document.getElementById("selectedText").textContent  = "No";
    document.getElementById("offerSent").value = "No";
    document.getElementById("selected").value  = "No";
    goToStep(1);

  } catch (error) {
    showToast("❌ Error saving. Check your Script URL.", true);
    console.error("Submit error:", error);
  } finally {
    btnText.classList.remove("hidden");
    btnLoader.classList.add("hidden");
    submitBtn.disabled = false;
  }
});

function getValue(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

// =============================================
// TOAST NOTIFICATION
// =============================================
function showToast(msg, isError = false) {
  const toast = document.getElementById("toast");
  document.getElementById("toastMsg").textContent = msg;
  toast.style.background = isError ? "#be123c" : "#1e293b";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 4000);
}

// =============================================
// SET TODAY AS DEFAULT APPLICATION DATE
// =============================================
document.getElementById("applicationDate").valueAsDate = new Date();
