package com.application.chat.dtos;

import java.util.List;

/**
 * DTO for adding or removing members from a chat group using usernames.
 */
public class ModifyGroupDTO {

    private String groupId;              // ID of the group to modify
    private List<String> memberUsernames; // List of members (usernames) to add/remove

    public ModifyGroupDTO() {}

    public ModifyGroupDTO(String groupId, List<String> memberUsernames) {
        this.groupId = groupId;
        this.memberUsernames = memberUsernames;
    }

    public String getGroupId() {
        return groupId;
    }

    public void setGroupId(String groupId) {
        this.groupId = groupId;
    }

    public List<String> getMemberUsernames() {
        return memberUsernames;
    }

    public void setMemberUsernames(List<String> memberUsernames) {
        this.memberUsernames = memberUsernames;
    }
}
