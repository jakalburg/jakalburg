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
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { SettingsActions } from "./settings-layout";

export function DeliveryTab() {
  const { data: storeSettings } = useSettings();
  const updateStoreMutation = useUpdateSettings();

  const [isEditing, setIsEditing] = useState(false);
  const [blueDartForm, setBlueDartForm] = useState({
    blueDartLoginId: "",
    blueDartLicenceKey: "",
    blueDartCustomerCode: "",
    blueDartApiKey: "",
  });
  const [dtdcForm, setDtdcForm] = useState({
    dtdcUsername: "",
    dtdcPassword: "",
    dtdcCustomerCode: "",
    dtdcApiKey: "",
  });
  const [delhiveryForm, setDelhiveryForm] = useState({
    delhiveryApiKey: "",
    delhiveryClientName: "",
  });

  useEffect(() => {
    if (storeSettings) {
      setBlueDartForm({
        blueDartLoginId: storeSettings.blueDartLoginId || "",
        blueDartLicenceKey: "",
        blueDartCustomerCode: storeSettings.blueDartCustomerCode || "",
        blueDartApiKey: "",
      });
      setDtdcForm({
        dtdcUsername: storeSettings.dtdcUsername || "",
        dtdcPassword: "",
        dtdcCustomerCode: storeSettings.dtdcCustomerCode || "",
        dtdcApiKey: "",
      });
      setDelhiveryForm({
        delhiveryApiKey: "",
        delhiveryClientName: storeSettings.delhiveryClientName || "",
      });
    }
  }, [storeSettings]);

  const handleCancel = () => {
    setIsEditing(false);
    if (storeSettings) {
      setBlueDartForm({
        blueDartLoginId: storeSettings.blueDartLoginId || "",
        blueDartLicenceKey: "",
        blueDartCustomerCode: storeSettings.blueDartCustomerCode || "",
        blueDartApiKey: "",
      });
      setDtdcForm({
        dtdcUsername: storeSettings.dtdcUsername || "",
        dtdcPassword: "",
        dtdcCustomerCode: storeSettings.dtdcCustomerCode || "",
        dtdcApiKey: "",
      });
      setDelhiveryForm({
        delhiveryApiKey: "",
        delhiveryClientName: storeSettings.delhiveryClientName || "",
      });
    }
  };

  const handleSaveShipping = (data: any) => {
    updateStoreMutation.mutate(data, {
      onSuccess: () => {
        setIsEditing(false);
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Blue Dart configuration */}
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Delivery / Shipping Providers</CardTitle>
            <CardDescription>
              Configure API keys for shipping partners like Blue Dart, DTDC,
              etc.
            </CardDescription>
          </div>
          <SettingsActions>
            {!isEditing ? (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="w-full md:w-auto"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit Configuration
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
                  onClick={() =>
                    handleSaveShipping({
                      ...blueDartForm,
                      ...(blueDartForm.blueDartLicenceKey
                        ? {}
                        : { blueDartLicenceKey: "" }),
                      ...(blueDartForm.blueDartApiKey
                        ? {}
                        : { blueDartApiKey: "" }),
                      ...dtdcForm,
                      ...(dtdcForm.dtdcPassword ? {} : { dtdcPassword: "" }),
                      ...(dtdcForm.dtdcApiKey ? {} : { dtdcApiKey: "" }),
                      ...delhiveryForm,
                      ...(delhiveryForm.delhiveryApiKey
                        ? {}
                        : { delhiveryApiKey: "" }),
                    })
                  }
                  disabled={updateStoreMutation.isPending}
                  className="w-full md:w-auto"
                >
                  Save All Shipping
                </Button>
              </>
            )}
          </SettingsActions>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="py-2">
            <h3 className="text-lg font-medium mb-4">Blue Dart</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Login ID</Label>
                <Input
                  value={blueDartForm.blueDartLoginId}
                  onChange={(e) =>
                    setBlueDartForm({
                      ...blueDartForm,
                      blueDartLoginId: e.target.value,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Code</Label>
                <Input
                  value={blueDartForm.blueDartCustomerCode}
                  onChange={(e) =>
                    setBlueDartForm({
                      ...blueDartForm,
                      blueDartCustomerCode: e.target.value,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Licence Key</Label>
                <Input
                  type="password"
                  placeholder="Leave empty to keep current"
                  value={blueDartForm.blueDartLicenceKey}
                  onChange={(e) =>
                    setBlueDartForm({
                      ...blueDartForm,
                      blueDartLicenceKey: e.target.value,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>API Profile Key (JWT)</Label>
                <Input
                  type="password"
                  placeholder="Leave empty to keep current"
                  value={blueDartForm.blueDartApiKey}
                  onChange={(e) =>
                    setBlueDartForm({
                      ...blueDartForm,
                      blueDartApiKey: e.target.value,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <h3 className="text-lg font-medium mb-4">DTDC</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={dtdcForm.dtdcUsername}
                  onChange={(e) =>
                    setDtdcForm({ ...dtdcForm, dtdcUsername: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Code</Label>
                <Input
                  value={dtdcForm.dtdcCustomerCode}
                  onChange={(e) =>
                    setDtdcForm({
                      ...dtdcForm,
                      dtdcCustomerCode: e.target.value,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="Leave empty to keep current"
                  value={dtdcForm.dtdcPassword}
                  onChange={(e) =>
                    setDtdcForm({ ...dtdcForm, dtdcPassword: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  placeholder="Leave empty to keep current"
                  value={dtdcForm.dtdcApiKey}
                  onChange={(e) =>
                    setDtdcForm({ ...dtdcForm, dtdcApiKey: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delhivery Configuration */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Delhivery</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Input
                  value={delhiveryForm.delhiveryClientName}
                  onChange={(e) =>
                    setDelhiveryForm({
                      ...delhiveryForm,
                      delhiveryClientName: e.target.value,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  placeholder="Leave empty to keep current"
                  value={delhiveryForm.delhiveryApiKey}
                  onChange={(e) =>
                    setDelhiveryForm({
                      ...delhiveryForm,
                      delhiveryApiKey: e.target.value,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
