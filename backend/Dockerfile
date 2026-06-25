FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw
RUN ./mvnw -q -DskipTests dependency:go-offline

COPY src src
RUN ./mvnw -DskipTests clean package

FROM eclipse-temurin:21-jre
WORKDIR /app

RUN addgroup --system spring && adduser --system spring --ingroup spring
COPY --from=build /app/target/*.jar /app/app.jar
RUN mkdir -p /app/uploads && chown -R spring:spring /app

USER spring:spring
EXPOSE 9090

ENV PORT=9090
ENTRYPOINT ["sh", "-c", "java -XX:+UseContainerSupport -XX:MaxRAMPercentage=75 -jar /app/app.jar"]
