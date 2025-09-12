package com.uvg.wellnessapp.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

  private final JwtService jwt;

  public JwtAuthFilter(JwtService jwt) {
    this.jwt = jwt;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String auth = request.getHeader(HttpHeaders.AUTHORIZATION);
    if (auth != null && auth.startsWith("Bearer ")) {
      String token = auth.substring(7);
      try {
        Long userId = jwt.getUserId(token);
        String email = jwt.getEmail(token);

        AbstractAuthenticationToken authentication =
            new AbstractAuthenticationToken(List.of(new SimpleGrantedAuthority("ROLE_USER"))) {
              @Override public Object getCredentials() { return token; }
              @Override public Object getPrincipal() { return userId; }
            };
        authentication.setDetails(email);
        authentication.setAuthenticated(true);
        SecurityContextHolder.getContext().setAuthentication(authentication);
      } catch (Exception ignored) {
        // Token inválido/expirado: seguimos sin auth (endpoints protegidos devolverán 401)
      }
    }
    filterChain.doFilter(request, response);
  }
}
