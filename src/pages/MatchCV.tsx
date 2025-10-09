import { CareerFitAnalyst } from "@/components/CareerFitAnalyst";

const MatchCV = () => {
  return (
    <div className="flex flex-col items-center justify-center text-left gap-6">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Match Maker</h1>
        <p className="max-w-[700px] text-muted-foreground md:text-xl">
          Analyze job descriptions against your profile to find the perfect fit.
        </p>
      </div>
      <div className="mt-8 w-full max-w-3xl">
        <CareerFitAnalyst />
      </div>
    </div>
  );
};

export default MatchCV;