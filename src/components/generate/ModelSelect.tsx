import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ModelType {
  id: string;
  name: string;
}

interface ModelSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const ModelSelect = ({ value, onChange }: ModelSelectProps) => {
  const [modelTypes, setModelTypes] = useState<ModelType[]>([]);

  useEffect(() => {
    fetchModelTypes();
  }, []);

  const fetchModelTypes = async () => {
    const { data } = await supabase
      .from("model_types")
      .select("id, name")
      .order("name");

    if (data) {
      setModelTypes(data);
    }
  };

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a model type" />
      </SelectTrigger>
      <SelectContent>
        {modelTypes.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            {model.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ModelSelect;
