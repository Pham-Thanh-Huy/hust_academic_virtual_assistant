FROM maven:3.9.6-eclipse-temurin-21 AS Build

WORKDIR /app

COPY src ./src
COPY pom.xml .

RUN ["mvn", "clean", "package", "-Dmaven.test.skip"]

FROM eclipse-temurin:21-jre-jammy

WORKDIR /app

COPY --from=Build /app/target/crawler_service-0.0.1-SNAPSHOT.jar ./crawler_service-0.0.1-SNAPSHOT.jar
COPY --from=Build /app/src/main/resources/application-prod.yml ./application-prod.yml

CMD java -jar crawler_service-0.0.1-SNAPSHOT.jar --spring.config.localtion=file:///app/application-prod.yml --spring.profiles.active=prod
