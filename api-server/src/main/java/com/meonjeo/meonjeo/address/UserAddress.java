package com.meonjeo.meonjeo.address;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity @Table(name="user_addresses")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserAddress {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long userId; // SecurityContext에서 주입

    @NotBlank private String receiver;
    @NotBlank private String phone;
    @NotBlank private String addr1;
    private String addr2;
    @NotBlank private String zipcode;

    private boolean primaryAddress;
}
