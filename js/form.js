/**
 * AllinBand — Manejo de Formulario
 * Validación y envío del formulario de contacto
 */

(function () {
  "use strict";

  var contactForm = document.getElementById("contactForm");

  if (!contactForm) {
    return;
  }

  // ========================================
  // VALIDACIÓN DEL FORMULARIO
  // ========================================

  function validateEmail(email) {
    var regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  function validatePhone(phone) {
    var regex = /^[\d\s\-\(\)\+]+$/;
    return !phone || regex.test(phone);
  }

  function showError(input, message) {
    var formGroup = input.closest(".form-group");
    var errorElement = formGroup.querySelector(".form-error");

    if (!errorElement) {
      errorElement = document.createElement("div");
      errorElement.className = "form-error";
      formGroup.appendChild(errorElement);
    }

    errorElement.textContent = message;
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", "error-" + input.id);
    errorElement.id = "error-" + input.id;
    input.style.borderColor = "#ef4444";
  }

  function clearError(input) {
    var formGroup = input.closest(".form-group");
    var errorElement = formGroup.querySelector(".form-error");

    if (errorElement) {
      errorElement.remove();
    }

    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");
    input.style.borderColor = "";
  }

  function clearAllErrors() {
    var inputs = contactForm.querySelectorAll("input, select, textarea");
    inputs.forEach(function (input) {
      clearError(input);
    });
  }

  // ========================================
  // VALIDACIÓN EN TIEMPO REAL
  // ========================================

  var nameInput = document.getElementById("name");
  var emailInput = document.getElementById("email");
  var phoneInput = document.getElementById("phone");
  var roleSelect = document.getElementById("role");

  if (emailInput) {
    emailInput.addEventListener("blur", function () {
      if (this.value && !validateEmail(this.value)) {
        showError(this, "Por favor, introduce un email válido");
      } else {
        clearError(this);
      }
    });
  }

  if (phoneInput) {
    phoneInput.addEventListener("blur", function () {
      if (this.value && !validatePhone(this.value)) {
        showError(this, "Por favor, introduce un teléfono válido");
      } else {
        clearError(this);
      }
    });
  }

  // ========================================
  // ENVÍO DEL FORMULARIO
  // ========================================

  contactForm.addEventListener("submit", function (e) {
    e.preventDefault();

    clearAllErrors();

    var formData = {
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      phone: phoneInput.value.trim(),
      role: roleSelect.value,
      message: document.getElementById("message").value.trim(),
    };

    var isValid = true;

    if (!formData.name) {
      showError(nameInput, "El nombre es obligatorio");
      isValid = false;
    }

    if (!formData.email) {
      showError(emailInput, "El email es obligatorio");
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      showError(emailInput, "Por favor, introduce un email válido");
      isValid = false;
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      showError(phoneInput, "Por favor, introduce un teléfono válido");
      isValid = false;
    }

    if (!formData.role) {
      showError(roleSelect, "Por favor, selecciona una opción");
      isValid = false;
    }

    if (!isValid) {
      var firstError = contactForm.querySelector("[aria-invalid='true']");
      if (firstError) firstError.focus();
      return;
    }

    // ========================================
    // SIMULACIÓN DE ENVÍO
    // ========================================

    console.log("Datos del formulario:", formData);

    var submitButton = contactForm.querySelector('button[type="submit"]');
    var originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Enviando...";

    setTimeout(function () {
      showSuccessMessage();
      contactForm.reset();
      submitButton.disabled = false;
      submitButton.textContent = originalText;
      console.log("Formulario enviado correctamente (simulación)");
    }, 2000);
  });

  // ========================================
  // MENSAJE DE ÉXITO
  // ========================================

  function showSuccessMessage() {
    var successDiv = document.createElement("div");
    successDiv.className = "alert-success";
    successDiv.setAttribute("role", "alert");
    successDiv.style.cssText =
      "background-color: rgba(16, 185, 129, 0.1); color: #d1d5db; padding: var(--space-6); border-radius: var(--radius-lg); margin-bottom: var(--space-6); border-left: 4px solid #10b981;";
    successDiv.innerHTML =
      "<strong style='color: #f9fafb;'>Gracias por tu interés!</strong><br>" +
      "Hemos recibido tu solicitud. Nos pondremos en contacto contigo pronto.";

    contactForm.parentNode.insertBefore(successDiv, contactForm);
    successDiv.scrollIntoView({ behavior: "smooth", block: "center" });

    setTimeout(function () {
      successDiv.style.opacity = "0";
      successDiv.style.transform = "translateY(-20px)";
      successDiv.style.transition = "all var(--transition-base)";

      setTimeout(function () {
        successDiv.remove();
      }, 300);
    }, 5000);
  }

  console.log("Formulario inicializado");
})();
