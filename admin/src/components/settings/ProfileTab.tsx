"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { SettingsActions } from "./settings-layout";

export function ProfileTab() {
  const { data: profileData, isLoading: isLoadingProfile } = useProfile();
  const updateProfileMutation = useUpdateProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    country: "",
    zipCode: "",
  });

  useEffect(() => {
    if (profileData) {
      setProfileForm({
        firstName: profileData.firstName || "",
        lastName: profileData.lastName || "",
        addressLine1: profileData.addressLine1 || "",
        addressLine2: profileData.addressLine2 || "",
        city: profileData.city || "",
        country: profileData.country || "",
        zipCode: profileData.zipCode || "",
      });
    }
  }, [profileData]);

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileForm, {
      onSuccess: () => {
        setIsEditing(false);
      },
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (profileData) {
      setProfileForm({
        firstName: profileData.firstName || "",
        lastName: profileData.lastName || "",
        addressLine1: profileData.addressLine1 || "",
        addressLine2: profileData.addressLine2 || "",
        city: profileData.city || "",
        country: profileData.country || "",
        zipCode: profileData.zipCode || "",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </div>
        <SettingsActions>
          {!isEditing ? (
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="w-full md:w-auto"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="w-full md:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
                className="w-full md:w-auto"
              >
                Save Changes
              </Button>
            </>
          )}
        </SettingsActions>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoadingProfile ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={profileForm.firstName}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      firstName: e.target.value,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={profileForm.lastName}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, lastName: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine1">Address Line 1</Label>
              <Input
                id="addressLine1"
                value={profileForm.addressLine1}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    addressLine1: e.target.value,
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                value={profileForm.addressLine2}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    addressLine2: e.target.value,
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={profileForm.city}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, city: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={profileForm.country}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, country: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  value={profileForm.zipCode}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, zipCode: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
