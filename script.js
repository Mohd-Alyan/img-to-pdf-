/**
 * Enhanced Image to PDF Converter
 * Professional PDF converter with advanced features
 */

class PDFConverter {
  constructor() {
    this.files = [];
    this.initializeElements();
    this.attachEventListeners();
    this.checkLibraries();
  }

  /**
   * Initialize DOM elements
   */
  initializeElements() {
    this.convertBtn = document.getElementById("convertBtn");
    this.imageInput = document.getElementById("imageInput");
    this.dropZone = document.getElementById("dropZone");
    this.preview = document.getElementById("preview");
    this.progressContainer = document.getElementById("progressContainer");
    this.progressBar = document.getElementById("progressBar");
    this.pageSize = document.getElementById("pageSize");
    this.orientation = document.getElementById("orientation");
    this.quality = document.getElementById("quality");
    this.fileName = document.getElementById("fileName");
  }

  /**
   * Check if required libraries are loaded
   */
  checkLibraries() {
    if (!window.jspdf) {
      this.showNotification("jsPDF library failed to load. Please refresh the page.", 'error');
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    this.convertBtn.addEventListener("click", () => this.convertToPDF());
    this.imageInput.addEventListener("change", (e) => this.handleFileSelect(e.target.files));
    this.setupDragAndDrop();
  }

  /**
   * Setup drag and drop functionality
   */
  setupDragAndDrop() {
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.dropZone.addEventListener(eventName, this.preventDefaults, false);
    });

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
      this.dropZone.addEventListener(eventName, () => {
        this.dropZone.style.background = 'linear-gradient(145deg, #e9ecef, #f8f9fa)';
        this.dropZone.style.transform = 'translateY(-5px)';
      }, false);
    });

    // Unhighlight drop area when item leaves it
    ['dragleave', 'drop'].forEach(eventName => {
      this.dropZone.addEventListener(eventName, () => {
        this.dropZone.style.background = 'linear-gradient(145deg, #f8f9fa, #e9ecef)';
        this.dropZone.style.transform = 'translateY(0)';
      }, false);
    });

    // Handle dropped files
    this.dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      this.handleFileSelect(files);
    }, false);
  }

  /**
   * Prevent default drag behaviors
   */
  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * Handle file selection from input or drag & drop
   */
  handleFileSelect(fileList) {
    const validFiles = Array.from(fileList).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (validFiles.length !== fileList.length) {
      this.showNotification('Some files were skipped (not images)', 'error');
    }
    
    if (validFiles.length === 0) {
      this.showNotification('No valid image files selected', 'error');
      return;
    }
    
    this.files = validFiles;
    this.imageInput.files = this.createFileList(validFiles);
    this.previewImages();
  }

  /**
   * Create a FileList object from array of files
   */
  createFileList(files) {
    const dt = new DataTransfer();
    files.forEach(file => dt.items.add(file));
    return dt.files;
  }

  /**
   * Preview selected images with dustbin icon
   */
  previewImages() {
    this.preview.innerHTML = "";
    
    if (this.files.length === 0) {
      return;
    }
    
    this.files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewContainer = document.createElement("div");
        previewContainer.className = "image-preview";
        
        const img = document.createElement("img");
        img.src = e.target.result;
        img.alt = file.name;
        img.title = file.name;
        
        // Create dustbin icon (UPDATED)
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-icon";
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = "Delete image";
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          this.removeImage(index);
        };
        
        previewContainer.appendChild(img);
        previewContainer.appendChild(deleteBtn);
        this.preview.appendChild(previewContainer);
      };
      
      reader.onerror = () => {
        this.showNotification(`Failed to load image: ${file.name}`, 'error');
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Remove image from selection (UPDATED)
   */
  removeImage(index) {
    this.files.splice(index, 1);
    this.imageInput.files = this.createFileList(this.files);
    this.previewImages();
    
    if (this.files.length === 0) {
      this.showNotification('All images removed', 'error');
    } else {
      this.showNotification('Image removed successfully');
    }
  }

  /**
   * Convert images to PDF
   */
  async convertToPDF() {
    if (!window.jspdf) {
      this.showNotification("jsPDF library not loaded", 'error');
      return;
    }

    if (this.files.length === 0) {
      this.showNotification("Please select at least one image", 'error');
      return;
    }

    this.setLoading(true);
    this.showProgress();

    try {
      const { jsPDF } = window.jspdf;
      const settings = this.getSettings();
      let pdf = null;

      for (let i = 0; i < this.files.length; i++) {
        const progress = ((i + 1) / this.files.length) * 100;
        this.updateProgress(progress);

        const file = this.files[i];
        
        try {
          const imgData = await this.toBase64(file);
          const img = await this.loadImage(imgData);
          
          const dimensions = this.calculateDimensions(img, settings);
          
          if (i === 0) {
            pdf = new jsPDF({
              orientation: dimensions.orientation,
              unit: "mm",
              format: dimensions.format
            });
          } else {
            pdf.addPage(dimensions.format, dimensions.orientation);
          }

          const compression = this.getCompressionLevel();
          pdf.addImage(img, "JPEG", dimensions.x, dimensions.y, 
                      dimensions.width, dimensions.height, 
                      undefined, compression);
                      
        } catch (error) {
          this.showNotification(`Error processing ${file.name}: ${error.message}`, 'error');
          continue;
        }
      }

      if (pdf) {
        const fileName = this.fileName.value.trim() || 'converted';
        pdf.save(`${fileName}.pdf`);
        this.showNotification("PDF created successfully! 🎉");
      } else {
        this.showNotification("No images could be processed", 'error');
      }
      
    } catch (error) {
      this.showNotification("Error creating PDF: " + error.message, 'error');
      console.error('PDF conversion error:', error);
    } finally {
      this.setLoading(false);
      this.hideProgress();
    }
  }

  /**
   * Get current settings from form
   */
  getSettings() {
    return {
      pageSize: this.pageSize.value,
      orientation: this.orientation.value,
      quality: this.quality.value
    };
  }

  /**
   * Calculate dimensions for image placement
   */
  calculateDimensions(img, settings) {
    let format, orientation;
    
    const formats = {
      'a4': [210, 297],
      'a3': [297, 420],
      'letter': [216, 279],
      'legal': [216, 356]
    };

    if (settings.pageSize === 'auto') {
      // Fit page to image size
      const imgWidthMM = img.width * 0.264583;
      const imgHeightMM = img.height * 0.264583;
      format = [imgWidthMM, imgHeightMM];
      orientation = imgWidthMM > imgHeightMM ? "landscape" : "portrait";
    } else {
      // Use standard page size
      format = formats[settings.pageSize];
      orientation = settings.orientation === 'auto' 
        ? (img.width > img.height ? "landscape" : "portrait")
        : settings.orientation;
    }

    // Adjust format for landscape orientation
    if (orientation === "landscape" && format[0] < format[1]) {
      format = [format[1], format[0]];
    }

    const pageWidth = format[0];
    const pageHeight = format[1];
    
    let width, height;
    
    if (settings.pageSize === 'auto') {
      // Image fills entire page
      width = pageWidth;
      height = pageHeight;
    } else {
      // Scale image to fit within page margins
      const aspectRatio = img.width / img.height;
      const pageAspectRatio = pageWidth / pageHeight;
      
      if (aspectRatio > pageAspectRatio) {
        // Image is wider - fit to width
        width = pageWidth * 0.9;
        height = width / aspectRatio;
      } else {
        // Image is taller - fit to height
        height = pageHeight * 0.9;
        width = height * aspectRatio;
      }
    }

    return {
      format,
      orientation,
      width,
      height,
      x: (pageWidth - width) / 2,
      y: (pageHeight - height) / 2
    };
  }

  /**
   * Get compression level based on quality setting
   */
  getCompressionLevel() {
    const levels = {
      'high': 'NONE',
      'medium': 'MEDIUM', 
      'low': 'FAST'
    };
    return levels[this.quality.value];
  }

  /**
   * Convert file to base64
   */
  toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Load image and return promise
   */
  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = src;
    });
  }

  /**
   * Set loading state
   */
  setLoading(loading) {
    if (loading) {
      this.convertBtn.disabled = true;
      this.convertBtn.innerHTML = `
        <div class="loading-spinner"></div>
        <span>Converting...</span>
      `;
    } else {
      this.convertBtn.disabled = false;
      this.convertBtn.innerHTML = `
        <i class="fas fa-file-pdf"></i>
        <span>Convert to PDF</span>
      `;
    }
  }

  /**
   * Show progress bar
   */
  showProgress() {
    this.progressContainer.classList.add('active');
  }

  /**
   * Hide progress bar
   */
  hideProgress() {
    this.progressContainer.classList.remove('active');
    this.updateProgress(0);
  }

  /**
   * Update progress bar
   */
  updateProgress(percent) {
    this.progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  }

  /**
   * Show notification to user
   */
  showNotification(message, type = 'success') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => {
      notif.classList.remove('show');
      setTimeout(() => {
        if (notif.parentNode) {
          notif.parentNode.removeChild(notif);
        }
      }, 300);
    });

    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Hide and remove notification
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }
}

// Initialize the converter when the page loads
document.addEventListener('DOMContentLoaded', () => {
  try {
    new PDFConverter();
  } catch (error) {
    console.error('Failed to initialize PDF converter:', error);
    alert('Failed to initialize PDF converter. Please refresh the page.');
  }
});
