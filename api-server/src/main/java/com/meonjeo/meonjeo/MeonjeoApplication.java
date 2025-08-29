package com.meonjeo.meonjeo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MeonjeoApplication {
    public static void main(String[] args) {
        SpringApplication.run(MeonjeoApplication.class, args);
    }
}
