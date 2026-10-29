package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.Entity.*;
import com.real_estate.Kunal.Repository.UserRepository;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ChatAccessPolicyTest {
    private final UserRepository users = mock(UserRepository.class);
    private final ChatAccessPolicy policy = new ChatAccessPolicy(users);

    private User member(long id, Role role, Long parent) {
        User user = User.builder().id(id).role(role).addedBy(parent).build();
        when(users.findById(id)).thenReturn(Optional.of(user));
        return user;
    }

    @Test void teammatesCanChatAcrossAllRolesButCannotCrossWorkspaceBranches() {
        User root = member(1, Role.SUPER_ADMIN, null);
        User sub = member(2, Role.SUB_ADMIN, 1L);
        User admin = member(3, Role.ADMIN, 2L);
        User employee = member(4, Role.EMPLOYEE, 3L);
        User other = member(5, Role.SUB_ADMIN, 1L);
        User otherEmployee = member(6, Role.EMPLOYEE, 5L);
        assertThat(policy.canContact(sub, admin)).isTrue();
        assertThat(policy.canContact(employee, sub)).isTrue();
        assertThat(policy.canContact(admin, employee)).isTrue();
        assertThat(policy.canContact(root, otherEmployee)).isTrue();
        assertThat(policy.canContact(employee, root)).isTrue();
        assertThat(policy.canContact(employee, other)).isFalse();
        assertThat(policy.canContact(admin, otherEmployee)).isFalse();
        assertThat(policy.canContact(employee, employee)).isFalse();
    }

    @Test void missingOrCyclicParentsDoNotGrantWorkspaceAccess() {
        User orphan = member(10, Role.EMPLOYEE, 99L);
        User cyclic = member(11, Role.ADMIN, 12L);
        member(12, Role.EMPLOYEE, 11L);
        User other = member(13, Role.ADMIN, null);
        assertThat(policy.canContact(orphan, other)).isFalse();
        assertThat(policy.canContact(cyclic, other)).isFalse();
    }
}
