// ------------------------------------------------------------
// Optional: hover-to-animate paper thumbnails.
// Add   data-hover="images/your-animation.gif"   to any <img>
// and it will swap to the animated version while hovered.
// (This is the modern, jankier-code-free version of the
//  intro_start/intro_stop pattern on the reference sites.)
// ------------------------------------------------------------
document.querySelectorAll('img[data-hover]').forEach(function (img) {
  var base  = img.getAttribute('src');
  var hover = img.getAttribute('data-hover');
  new Image().src = hover; // preload so the swap is instant
  img.addEventListener('mouseenter', function () { img.src = hover; });
  img.addEventListener('mouseleave', function () { img.src = base; });
});

// Keep the footer year current automatically.
var yearEl = document.getElementById('year');
if (yearEl) { yearEl.textContent = new Date().getFullYear(); }

// The theme toggle lives inline at the end of each page, so it never
// depends on this file's browser-cache state.
