package com.sanasa.attendance.repository;

import com.sanasa.attendance.model.Shift;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShiftRepository extends MongoRepository<Shift, String> {
    Optional<Shift> findByName(String name);

    List<Shift> findByActiveTrue();
}
