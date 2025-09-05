# 빌드 단계
FROM gradle:8.7-jdk17 AS build
WORKDIR /usr/src/app/api-server

# api-server 폴더 내용 복사
COPY . .

# gradlew 실행권한 + CRLF → LF 교정
RUN apt-get update && apt-get install -y dos2unix \
 && dos2unix gradlew \
 && chmod +x gradlew

# gradle-wrapper.properties 도 CRLF 가능성 → 같이 교정
RUN dos2unix gradle/wrapper/gradle-wrapper.properties || true

# gradle 동작 확인
RUN ./gradlew --version

# 빌드
RUN ./gradlew clean build -x test

# 실행 단계
FROM openjdk:17-jdk-slim
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/api-server/build/libs/*.jar app.jar

ENV TZ=Asia/Seoul
RUN ln -sf /usr/share/zoneinfo/Asia/Seoul /etc/localtime && echo "Asia/Seoul" > /etc/timezone

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar", "--spring.profiles.active=prod"]
