// Select DOM elements safely
const convertBtn = document.getElementById("convertBtn");
const imageInput = document.getElementById("imageInput");
const dropZone = document.getElementById("dropZone");
const preview = document.getElementById("preview");

// Ensure jsPDF is available
if (!window.jspdf) {
  alert("jsPDF library failed to load. Please refresh the page.");
}

// Convert images to PDF
convertBtn.addEventListener("click", async () => {
  const { jsPDF } = window.jspdf;

  if (!imageInput.files || imageInput.files.length === 0) {
    alert("Please select at least one image!");
    return;
  }

  let pdf;

  for (let i = 0; i < imageInput.files.length; i++) {
    const file = imageInput.files[i];

    // Ensure file is an image
    if (!file.type.startsWith("image/")) {
      alert(`File "${file.name}" is not an image and will be skipped.`);
      continue;
    }

    const imgData = await toBase64(file);
    const img = new Image();
    img.src = imgData;

    await new Promise((resolve) => {
      img.onload = () => {
        const imgWidthMM = img.width * 0.264583;  // px → mm
        const imgHeightMM = img.height * 0.264583;

        if (i === 0) {
          pdf = new jsPDF({
            orientation: imgWidthMM > imgHeightMM ? "l" : "p",
            unit: "mm",
            format: [imgWidthMM, imgHeightMM]
          });
        } else {
          pdf.addPage([imgWidthMM, imgHeightMM], imgWidthMM > imgHeightMM ? "l" : "p");
        }

        // Center the image on the page
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const x = (pageWidth - imgWidthMM) / 2;
        const y = (pageHeight - imgHeightMM) / 2;

        pdf.addImage(img, "JPEG", x, y, imgWidthMM, imgHeightMM);
        resolve();
      };
      img.onerror = () => {
        alert(`Failed to load image: ${file.name}`);
        resolve();
      };
    });
  }

  if (pdf) {
    pdf.save("converted.pdf");
  }
});

// Convert file to base64
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

// Preview images
function previewImages(files) {
  preview.innerHTML = "";
  Array.from(files).forEach((file) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.src = e.target.result;
      img.alt = file.name;
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

// File input change event
imageInput.addEventListener("change", (event) => {
  previewImages(event.target.files);
});

// Drag & drop support
if (dropZone) {
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.background = "#dfe6ff";
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.style.background = "#f9f9ff";
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.style.background = "#f9f9ff";

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      imageInput.files = files; // Assign dropped files to input
      previewImages(files);
    }
  });
}
