package com.meonjeo.meonjeo.feedback.report.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ReportCreateRequest(@NotNull Long feedbackId, @NotBlank String reason) {}