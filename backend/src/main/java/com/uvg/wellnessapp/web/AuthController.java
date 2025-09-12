package com.uvg.wellnessapp.web;

import com.uvg.wellnessapp.domain.User;
import com.uvg.wellnessapp.repository.UserRepository;
import com.uvg.wellnessapp.security.JwtService;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@Validated
public class AuthController {

  private final UserRepository users;
  private final PasswordEncoder encoder;
  private final JwtService jwt;

  public AuthController(UserRepository users, PasswordEncoder encoder, JwtService jwt) {
    this.users = users; this.encoder = encoder; this.jwt = jwt;
  }

  public static final class RegisterRequest {
    @NotBlank @Email public String email;
    @NotBlank public String password;
  }
  public static final class LoginRequest {
    @NotBlank @Email public String email;
    @NotBlank public String password;
  }

  @PostMapping("/register")
  public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
    if (users.existsByEmail(req.email)) {
      return ResponseEntity.badRequest().body(Map.of("error","Email ya registrado"));
    }
    User u = new User();
    u.setEmail(req.email);
    u.setPasswordHash(encoder.encode(req.password));
    users.save(u);
    return ResponseEntity.status(201).body(Map.of("id", u.getId(), "email", u.getEmail()));
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@RequestBody LoginRequest req) {
    var u = users.findByEmail(req.email).orElse(null);
    if (u == null || !encoder.matches(req.password, u.getPasswordHash())) {
      return ResponseEntity.status(401).body(Map.of("error","Credenciales inválidas"));
    }
    String token = jwt.generateToken(u.getId(), u.getEmail());
    return ResponseEntity.ok(Map.of("token", token, "userId", u.getId(), "email", u.getEmail()));
  }
}
