package com.meonjeo.meonjeo.shipment;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name="courier_company", indexes = {
        @Index(name="uk_courier_code", columnList = "code", unique = true)
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CourierCompany {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(length=8, nullable=false, unique=true) private String code; // e.g. "04"
    @Column(length=100, nullable=false) private String name;            // "CJ대한통운"
    @Column(name="international_yn") private Boolean internationalYn;   // null 허용
}
