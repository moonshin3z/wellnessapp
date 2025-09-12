package com.uvg.wellnessapp.repository;

import com.uvg.wellnessapp.domain.AssessmentResult;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AssessmentResultRepository extends JpaRepository<AssessmentResult, Long> {
  List<AssessmentResult> findAllByOrderByCreatedAtDesc();
  List<AssessmentResult> findByUserIdOrderByCreatedAtDesc(Long userId);
}
