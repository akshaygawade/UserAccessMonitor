public with sharing class AccessMonitor {
    @AuraEnabled(cacheable=true)
    public static List<Profile> fetchProfiles() {
        return [Select Id, Name From Profile];
    }
    @AuraEnabled(cacheable=true)
    public static List<PermissionSet> fetchPermissionSets() {
        return [SELECT Id, Name, Label FROM PermissionSet WHERE IsOwnedByProfile = FALSE];
    }
    @AuraEnabled(cacheable=true)
    public static List<Group> fetchQueues() {
        return [SELECT Id, Name FROM Group where type='Queue'];
    }
    
    @AuraEnabled(cacheable=true)
    public static List<PackageLicense> fetchPackageLicenses() {
        return [SELECT Id, NamespacePrefix, Status FROM PackageLicense WHERE NamespacePrefix !='sf_chttr_apps'];
    }
    
    @AuraEnabled
    public static List<UserReportWrapper> fetchUsers(String profileId){
        List<user> users = [SELECT Id,Name,Username,UserType,Title FROM User WHERE ProfileId =:profileId AND isActive=true];
        set<Id> userIds =new set<Id>();
        for(User u1:users){
        userIds.add(u1.Id);
        }
        System.debug('users ->'+users); 
        //query All Permission Set Assignment By Users
        List<PermissionSetAssignment> permissionSetAsmts = [SELECT Id, PermissionSetId, AssigneeId, SystemModstamp, Assignee.Name,PermissionSet.Name, Assignee.IsActive 
                                                        FROM PermissionSetAssignment 
                                                        WHERE permissionSet.IsOwnedByProfile = FALSE
                                                        AND AssigneeId IN: userIds];
        //Query All QueueMembers By Users
        List<GroupMember> queueMem = [SELECT UserOrGroupId,GroupId,Group.Name FROM GroupMember 
                                    WHERE UserOrGroupId IN: userIds
                                    AND Group.type = 'Queue'];   
    
        //Query ALL Package Licence By Users
        List<UserPackageLicense> packageAssignmentList = [SELECT Id,UserId,PackageLicenseId,PackageLicense.NamespacePrefix,PackageLicense.Status 
                                                FROM UserPackageLicense
                                                WHERE UserId IN: userIds];                                  
    
        return createReport(users, userIds, permissionSetAsmts,queueMem,packageAssignmentList);
    }
    
    public static List<UserReportWrapper> createReport(List<user> users, set<Id> userIds, List<PermissionSetAssignment> permissionSetAsmts, List<GroupMember> queueMem,List<UserPackageLicense> packageAssignmentList){
        List<UserReportWrapper> wrapperList = new List<UserReportWrapper>();
    
        for(User usr: users){
        UserReportWrapper wrapper= new UserReportWrapper();
        string localPst='';
        String localQueM='';
        String localPackageAsmt='';
        //Process Permission Sets
        for(PermissionSetAssignment pst: permissionSetAsmts){
            if(usr.Id==pst.AssigneeId)
                localPst += pst.PermissionSet.Name+',\n';
        }
    
        //Process Queues
        for(GroupMember queM: queueMem){
            if(usr.Id==queM.UserOrGroupId)
                localQueM += queM.Group.Name+',\n';
        }
    
        //Process Packages
    
        for(UserPackageLicense pasmt: packageAssignmentList){
            if(usr.Id==pasmt.UserId)
                localPackageAsmt += pasmt.PackageLicense.NamespacePrefix+',\n';
        }
        localPst= localPst.removeEnd(',\n');
        localQueM= localQueM.removeEnd(',\n');
        localPackageAsmt= localPackageAsmt.removeEnd(',\n');
    
    
        wrapper.userId = usr.Id;
        wrapper.userName = usr.Name;
        wrapper.permissionSets = localPst !=''?localPst:'NA';
        wrapper.queues = localQueM !=''?localQueM:'NA';
        wrapper.packages = localPackageAsmt !=''?localPackageAsmt:'NA';
        wrapperList.add(wrapper);
        }
        return wrapperList;
    }
    
    @AuraEnabled
    public static List<UserReportWrapper> fetchUsersByFilters(String profileId,String permissionSetId,String queueId,String packageId){
    
        List<User> users;
        Integer index = 0;
        if(String.isNotBlank(profileId)){
            users = [SELECT Id,Name,Username,UserType,Title FROM User WHERE ProfileId =:profileId AND isActive=true];
            index++;
        }else
            users = [SELECT Id,Name,Username,UserType,Title FROM User where isActive=true];
        
        set<Id> userIds =new set<Id>();
        for(User u1:users){
            userIds.add(u1.Id);
        }
    
        if(String.isNotBlank(permissionSetId)){
            //query All Permission Set Assignment By Users
            List<PermissionSetAssignment> permissionSetAsmts = [SELECT Id, PermissionSetId, AssigneeId, SystemModstamp, Assignee.Name,PermissionSet.Name, Assignee.IsActive 
                                                                FROM PermissionSetAssignment 
                                                                WHERE permissionSet.IsOwnedByProfile = FALSE
                                                                AND  PermissionSetId=:permissionSetId];
            //if(!permissionSetAsmts.isEmpty()){
                for(Id u :userIds){ 
                    Boolean localTemp = false;
                    for(PermissionSetAssignment p :permissionSetAsmts){ 
                        if(u == p.AssigneeId)
                            localTemp=true;
                    }
                    if(!localTemp)
                        userIds.remove(u);
                }
                index++;
            //}
        }
    
        if(String.isNotBlank(queueId)){
            //Query All QueueMembers By Users
            List<GroupMember> queueMem = [SELECT UserOrGroupId,GroupId,Group.Name FROM GroupMember 
                                            WHERE GroupId=:queueId
                                            AND Group.type = 'Queue'];
                for(Id u :userIds){
                    Boolean localTemp = false;
                    for(GroupMember g :queueMem){ 
                        if(u == g.UserOrGroupId)
                            localTemp=true;
                    }
                    if(!localTemp)
                        userIds.remove(u);                       
                }
                index++;
                                  
        }
    
        if(String.isNotBlank(packageId)){
            //Query ALL Package Licence By Users
            List<UserPackageLicense> packageAssignmentList = [SELECT Id,UserId,PackageLicenseId,PackageLicense.NamespacePrefix,PackageLicense.Status 
                                                        FROM UserPackageLicense
                                                        WHERE PackageLicenseId=:packageId];  
                for(Id u :userIds){ 
                        Boolean localTemp = false;
                        
                        for(UserPackageLicense up :packageAssignmentList){ 
                            if(u == up.UserId)
                                localTemp=true;
                        }
                        if(!localTemp)
                            userIds.remove(u);                         
                    }
                    index++;
                                              
        }
    
        List<UserReportWrapper> wrapperList = new List<UserReportWrapper>();
        if(userIds.size() >0 && index != 0){
            List<User> userList = [Select Id,Email, Name From User Where id in :userIds];
            if(userList.size() > 0){
                for(User u :userList){
                    UserReportWrapper usrWrapper = new UserReportWrapper();
                    usrWrapper.userId = u.Id;
                    usrWrapper.userName = u.Name;
                    usrWrapper.user = u;
                    wrapperList.add(usrWrapper);
                }
            }
        }
    
        return wrapperList;
    
    }
    
    Public class  UserReportWrapper{
    @AuraEnabled public User user;
    @AuraEnabled public String userId;
    @AuraEnabled public String userName;
    @AuraEnabled public String permissionSets;
    @AuraEnabled public String queues;
    @AuraEnabled public String packages;
    }
    
    }