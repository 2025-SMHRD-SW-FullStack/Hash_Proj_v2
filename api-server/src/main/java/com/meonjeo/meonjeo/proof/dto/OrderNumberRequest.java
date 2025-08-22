// src/main/java/com/ressol/ressol/proof/dto/OrderNumberRequest.java
package com.meonjeo.meonjeo.proof.dto;
import jakarta.validation.constraints.NotBlank;
public record OrderNumberRequest(@NotBlank String orderNo) {}
