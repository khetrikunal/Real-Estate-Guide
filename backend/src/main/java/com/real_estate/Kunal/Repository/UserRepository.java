package com.real_estate.Kunal.Repository;


import com.real_estate.Kunal.Entity.Role;
import com.real_estate.Kunal.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);
    List<User> findByRole(Role role);
    List<User> findByRoleAndAddedBy(Role role, Long addedBy);
    List<User> findByRoleAndSignupSource(Role role, String signupSource);
    List<User> findTop5ByRoleOrderByIdDesc(Role role);
    long countByRole(Role role);

    long countByAddedBy(Long addedBy);

    long countByAssignedCityIgnoreCase(String assignedCity);

    List<User> findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(String name, String email);

    @org.springframework.data.jpa.repository.Query(value = """
        SELECT u.* FROM users u
        JOIN conversation_participants cp ON cp.user_id = u.id
        WHERE cp.conversation_id IN (
            SELECT conversation_id FROM conversation_participants WHERE user_id = :userId
        )
        AND u.id != :userId
        AND u.name ILIKE CONCAT('%', :query, '%')
        ORDER BY u.name ASC
        LIMIT 20
        """, nativeQuery = true)
    List<User> fuzzySearchContacts(@org.springframework.data.repository.query.Param("userId") Long userId, @org.springframework.data.repository.query.Param("query") String query);
}