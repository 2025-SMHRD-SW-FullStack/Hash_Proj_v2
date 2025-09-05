# 빌드 단계
FROM gradle:8.7-jdk17 AS build
WORKDIR /usr/src/app/api-server

# 🔴 여기! 현재 폴더 전체를 복사
COPY . .

# (윈도우에서 만든 프로젝트면 줄바꿈 이슈 대비)
# RUN apt-get update && apt-get install -y dos2unix && dos2unix gradlew

RUN chmod +x gradlew
RUN ./gradlew clean build -x test

# 실행 단계
FROM openjdk:17-jdk-slim
WORKDIR /usr/src/app

COPY --from=build /usr/src/app/api-server/build/libs/*.jar app.jar

# 시간대
ENV TZ=Asia/Seoul
RUN ln -sf /usr/share/zoneinfo/Asia/Seoul /etc/localtime && echo "Asia/Seoul" > /etc/timezone

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar", "--spring.profiles.active=prod"]
