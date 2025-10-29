import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface GenerateButtonProps {
  onClick: () => void;
  disabled: boolean;
  credits: number;
}

const GenerateButton = ({ onClick, disabled, credits }: GenerateButtonProps) => {
  return (
    <div className="flex flex-col items-center gap-4 pt-4">
      <Button
        onClick={onClick}
        disabled={disabled}
        size="lg"
        className="w-full sm:w-auto px-8"
      >
        <Sparkles className="mr-2 h-5 w-5" />
        Generate Image (1 Credit)
      </Button>
      {credits <= 0 && (
        <p className="text-sm text-destructive">
          You don't have enough credits. Please contact support to get more.
        </p>
      )}
    </div>
  );
};

export default GenerateButton;
