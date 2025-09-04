# 빌드 단계
FROM gradle:8.7-jdk17 AS build
WORKDIR /app

COPY . .

# gradlew 실행 권한 부여
RUN chmod +x gradlew

RUN ./gradlew clean build -x test

# 실행 단계 (가벼운 JRE)
FROM openjdk:17-jdk-slim
WORKDIR /app

# 빌드 산출물 복사
COPY --from=build /app/build/libs/*.jar app.jar

# 시간대 설정
RUN ln -sf /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone

EXPOSE 8080

# Spring Boot 프로필 prod로 실행
ENTRYPOINT ["java", "-jar", "app.jar", "--spring.profiles.active=prod"]
