package com.ressol.ressol.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EmailTokenException.class)
    public ResponseEntity<String> handleEmailTokenException(EmailTokenException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }

    @ExceptionHandler(UserAlreadyVerifiedException.class)
    public ResponseEntity<String> handleUserAlreadyVerifiedException(UserAlreadyVerifiedException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ex.getMessage());
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<String> handleUserNotFoundException(UserNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleUnhandledException(Exception ex, HttpServletRequest request) throws Exception {
        String uri = request.getRequestURI();

        // Swagger 요청은 무시하지 말고 명확히 출력하고 throw
        if (uri.startsWith("/v3/api-docs") || uri.startsWith("/swagger")) {
            System.err.println("🔥 Swagger 요청 중 예외 발생:");
            ex.printStackTrace();  // 콘솔에 찍히도록
            throw ex;
        }

        // 나머지 예외는 그대로 처리
        ex.printStackTrace();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .contentType(MediaType.APPLICATION_JSON)
                .body("서버 내부 오류가 발생했습니다.");
    }

    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<String> handleEmailExists(EmailAlreadyExistsException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ex.getMessage());
    }

    @ExceptionHandler(SocialAccountExistsException.class)
    public ResponseEntity<String> handleSocialExists(SocialAccountExistsException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ex.getMessage());
    }

    @ExceptionHandler(PasswordMismatchException.class)
    public ResponseEntity<String> handlePasswordMismatchException(PasswordMismatchException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }

    // Redis 예외 처리
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<String> handleRedisException(DataAccessException ex) {
        ex.printStackTrace();
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body("인증 데이터 저장소(Redis) 접근 중 오류가 발생했습니다.");
    }

}
