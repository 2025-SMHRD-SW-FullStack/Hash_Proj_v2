# syntax=docker/dockerfile:1.6

FROM gradle:8.7-jdk17 AS build
WORKDIR /usr/src/app/api-server

# 1) 의존성 파일 먼저 복사 (캐시 살리기)
COPY gradlew gradlew
COPY gradle gradle
COPY build.gradle build.gradle
COPY settings.gradle settings.gradle

# 2) CRLF -> LF 교정 (dos2unix 대신 sed 사용) + 실행권한
RUN sed -i 's/\r$//' gradlew \
 && sed -i 's/\r$//' gradle/wrapper/gradle-wrapper.properties || true \
 && chmod +x gradlew

# 3) Gradle 캐시 활용해서 미리 의존성 확인
RUN --mount=type=cache,target=/home/gradle/.gradle ./gradlew --version

# 4) 소스만 복사 (변경 최소화)
COPY src src

# 5) 빌드 (clean 제거: 증분 빌드 빠름)
RUN --mount=type=cache,target=/home/gradle/.gradle ./gradlew build -x test

# ---- Runtime ----
FROM eclipse-temurin:17-jre-jammy
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/api-server/build/libs/*.jar app.jar
ENV TZ=Asia/Seoul
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar","--spring.profiles.active=prod"]
