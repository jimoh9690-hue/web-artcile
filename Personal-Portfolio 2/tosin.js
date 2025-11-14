// Tab switching logic
const tabLinks = document.getElementsByClassName("tab-links");
const tabContents = document.getElementsByClassName("tab-contents");

function opentab(tabname) {
  for (let tabLink of tabLinks) {
    tabLink.classList.remove("active-link");
  }
  for (let tabContent of tabContents) {
    tabContent.classList.remove("active-tab");
  }
  event.currentTarget.classList.add("active-link");
  document.getElementById(tabname).classList.add("active-tab");
}

// Mobile menu toggle
const sidemenu = document.getElementById("sidemenu");

function openmenu() {
  sidemenu.style.right = "0";
}

function closemenu() {
  sidemenu.style.right = "-200px";
}

// Initialize AOS animations
document.addEventListener("DOMContentLoaded", function () {
  AOS.init({
    duration: 1000,
    once: true,
    offset: 100,
  });
});
