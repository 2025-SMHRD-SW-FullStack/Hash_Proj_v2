package com.yjs_default.yjs_default.company.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;

@Getter
@Schema(description = "회사 정보 수정 요청 DTO")
public class CompanyUpdateRequest {

    @Schema(description = "회사명", example = "글로벌고 주식회사")
    private String name;

    @Schema(description = "대표자명", example = "유준선")
    private String ceoName;

    @Schema(description = "사업자등록번호", example = "123-45-67890")
    private String businessNumber;

    @Schema(description = "업종", example = "제조업")
    private String industry;

    @Schema(description = "수출 품목", example = "반도체 부품")
    private String product;

    @Schema(description = "주소", example = "서울특별시 강남구 테헤란로 123")
    private String address;
}
