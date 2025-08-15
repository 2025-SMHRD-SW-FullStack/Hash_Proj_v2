// src/main/java/com/ressol/ressol/proof/dto/ReceiptRequest.java
package com.ressol.ressol.proof.dto;
import jakarta.validation.constraints.NotBlank;
public record ReceiptRequest(@NotBlank String imageUrl, Integer amount, String ocrText) {}
