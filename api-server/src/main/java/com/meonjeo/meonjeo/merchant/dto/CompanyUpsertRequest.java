package com.meonjeo.meonjeo.merchant.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "CompanyUpsertRequest", description = "사장 온보딩: 회사 정보 등록/수정")
public record CompanyUpsertRequest(

        @Schema(description = "노출명(브랜드/지점명)", example = "리쏠 홍대점")
        String name,

        @Schema(description = "사업자등록번호(하이픈 포함)", example = "123-45-67890")
        String bizRegNo,

        @Schema(description = "대표 연락처", example = "02-1234-5678")
        String contact,

        @Schema(description = "사업장 주소", example = "서울특별시 마포구 양화로 123, 3층")
        String address,

        @Schema(description = "정산 은행 코드(금융결제원 3자리)", example = "004")
        String payoutBank,

        @Schema(description = "정산 계좌번호(숫자만)", example = "110123456789")
        String payoutAccount,

        @Schema(description = "예금주명", example = "홍길동")
        String payoutHolder
) {}
